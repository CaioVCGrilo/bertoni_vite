import './style.css'
import * as pdfjsLib from 'pdfjs-dist'

// Configurar worker do PDF.js LOCAL (mais confiável)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'


// Proporções A4
const A4_RATIO = 210 / 297


// PDF Viewer
class PDFViewer {
  constructor() {
    this.container = document.getElementById('pdf-container')
    this.pagesContainer = document.getElementById('pdf-pages')
    this.loading = document.getElementById('pdf-loading')
    this.loadingText = document.getElementById('loading-text')
    this.pdfDoc = null
    // Calcular tamanho FIXO no momento da inicialização
    this.pageHeight = this.calculatePageHeight()
    this.isRendering = false // Flag para evitar renderizações simultâneas
    this.init()
    // NÃO chamar setupResize() - tamanho será fixo!
  }

  calculatePageHeight() {
    const containerHeight = window.innerHeight * 0.8
    const isMobile = window.innerWidth < 768

    if (isMobile) {
      const availableWidth = window.innerWidth * 0.9
      return Math.floor(availableWidth / A4_RATIO)
    }
    return Math.floor(containerHeight * 0.95)
  }


  async init() {
    try {
      this.loadingText.textContent = 'Carregando Cardápio...'

      // Carregar PDF diretamente
      const loadingTask = pdfjsLib.getDocument('/cardapio.pdf')

      // Adicionar listener de progresso
      loadingTask.onProgress = (progress) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100) > 100 ? 100 : Math.round((progress.loaded / progress.total) * 100)
          this.loadingText.textContent = `Carregando... ${percent}%`
        }
      }

      this.pdfDoc = await loadingTask.promise

      await this.renderAllPages()
      this.hideLoading()
    } catch (error) {
      this.showError(error.message || 'Erro desconhecido')
    }
  }

  async renderAllPages() {
    // Prevenir renderizações simultâneas
    if (this.isRendering) {
      return
    }

    this.isRendering = true

    // Limpar TODAS as páginas anteriores
    this.pagesContainer.innerHTML = ''


    // Ajustar largura do container
    const containerWidth = Math.floor(this.pageHeight * A4_RATIO)
    this.container.style.maxWidth = `${containerWidth}px`

    for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
      await this.renderPage(pageNum)
    }

    this.isRendering = false
  }

  async renderPage(pageNum) {
    try {
      const page = await this.pdfDoc.getPage(pageNum)

      // Obter viewport original
      const viewport = page.getViewport({ scale: 1 })

      // Calcular escala base para a altura desejada
      const baseScale = this.pageHeight / viewport.height

      // Usar devicePixelRatio para telas de alta resolução (mínimo 2x, máximo 4x)
      const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 2), 4)

      // Escala final: baseScale * pixelRatio para alta qualidade
      const renderScale = baseScale * pixelRatio * 1.5 // Multiplicador adicional para qualidade
      const scaledViewport = page.getViewport({ scale: renderScale })

      // Criar canvas com alta resolução
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', {
        alpha: false, // Melhor performance
        willReadFrequently: false
      })

      canvas.height = scaledViewport.height
      canvas.width = scaledViewport.width

      // Tamanho visual via CSS (menor que o canvas real para alta resolução)
      canvas.style.height = `${this.pageHeight}px`
      canvas.style.width = `${this.pageHeight * A4_RATIO}px`

      canvas.className = 'pdf-page-canvas'
      canvas.dataset.pageNumber = pageNum

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
        intent: 'display', // Otimizado para exibição
        enableWebGL: false,
        renderInteractiveForms: false,
        annotationMode: 0 // Sem anotações
      }

      await page.render(renderContext).promise
      this.pagesContainer.appendChild(canvas)

    } catch (error) {
    }
  }

  hideLoading() {
    this.loading.style.display = 'none'
  }

  showError(message) {
    this.loading.innerHTML = `
      <div class="text-center px-4 max-w-md">
        <div class="mb-4">
          <svg class="w-16 h-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <p class="text-red-400 mb-4 text-lg font-semibold">
          Erro ao carregar o cardápio
        </p>
        <p class="text-stone-400 text-sm mb-6">
          Por favor, tente recarregar a página ou verificar sua conexão com a internet.
        </p>
        <button onclick="window.location.reload()" class="bg-bertoni-gold text-black px-6 py-3 rounded font-bold uppercase text-sm hover:bg-opacity-90 transition-all">
          Recarregar Página
        </button>
        ${message ? `<p class="text-stone-600 text-xs mt-4">Detalhes técnicos: ${message}</p>` : ''}
      </div>
    `
  }
}

// Mobile Menu
function setupMobileMenu() {
  const button = document.getElementById('mobile-menu-button')
  const menu = document.getElementById('mobile-menu')

  button.addEventListener('click', () => {
    const isOpen = menu.style.maxHeight !== '0px' && menu.style.maxHeight !== ''

    if (isOpen) {
      menu.style.maxHeight = '0'
      menu.style.opacity = '0'
    } else {
      menu.style.maxHeight = '500px'
      menu.style.opacity = '1'
    }
  })

  // Fechar menu ao clicar em um link
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.style.maxHeight = '0'
      menu.style.opacity = '0'
    })
  })
}

// Smooth scroll
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute('href'))
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    })
  })
}

// Inicializar apenas uma vez
let initialized = false

document.addEventListener('DOMContentLoaded', () => {
  if (initialized) {
    return
  }

  initialized = true

  try {
    new PDFViewer()
    setupMobileMenu()
    setupSmoothScroll()
  } catch (error) {
  }
})

