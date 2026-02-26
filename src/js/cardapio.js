import '../styles/style.css'
import * as pdfjsLib from 'pdfjs-dist'

// Configurar worker do PDF.js LOCAL
pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/workers/pdf.worker.min.js'

// Proporções A4
const A4_RATIO = 210 / 297

// PDF Viewer com scroll fluido
class PDFViewer {
  constructor() {
    this.container = document.getElementById('pdf-container')
    this.pagesContainer = document.getElementById('pdf-pages')
    this.loading = document.getElementById('pdf-loading')
    this.loadingText = document.getElementById('loading-text')

    this.pdfDoc = null
    this.totalPages = 0
    this.pageHeight = this.calculatePageHeight()
    this.pageGap = 20 // Espaço entre páginas
    this.isRendering = false
    this.currentVisiblePage = 1

    // Controle de scroll sincronizado
    this.pdfSection = null
    this.isPdfAtBottom = false
    this.isPdfAtTop = true

    this.init()
  }

  calculatePageHeight() {
    // Altura ajustada para desktop maior
    const isMobile = window.innerWidth < 768

    if (isMobile) {
      const availableWidth = window.innerWidth * 0.9
      return Math.floor(availableWidth / A4_RATIO)
    }

    // Para desktop, usar altura maior para cardápio mais visível
    const containerHeight = window.innerHeight * 0.95 // Aumentado para 95% da altura da tela
    return Math.floor(containerHeight)
  }

  async init() {
    try {
      this.loadingText.textContent = 'Carregando Cardápio...'

      // Barra de progresso
      const progressBar = document.getElementById('progress-bar')
      const progressText = document.getElementById('progress-text')

      // Limpar cache de PDF se existir
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName)
          const requests = await cache.keys()
          for (const request of requests) {
            if (request.url.includes('cardapio.pdf')) {
              await cache.delete(request)
            }
          }
        }
      }

      // SEMPRE usar timestamp + random - nunca confiar em cache
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const pdfUrl = `/assets/documents/cardapio.pdf?nocache=${timestamp}_${random}`

      console.log('Carregando PDF:', pdfUrl)

      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
        withCredentials: false,
        isEvalSupported: false,
        useSystemFonts: true
      })

      // Adicionar listener de progresso
      loadingTask.onProgress = (progress) => {
        if (progress.total > 0) {
          const percent = Math.min(Math.round((progress.loaded / progress.total) * 100), 100)
          this.loadingText.textContent = `Carregando Cardápio...`

          if (progressBar) {
            progressBar.style.width = `${percent}%`
          }
          if (progressText) {
            progressText.textContent = `${percent}%`
          }
        }
      }

      this.pdfDoc = await loadingTask.promise
      this.totalPages = this.pdfDoc.numPages

      // Ajustar largura do container - mais largo no desktop
      const containerWidth = Math.floor(this.pageHeight * A4_RATIO)
      const isDesktop = window.innerWidth >= 768

      if (isDesktop) {
        // No desktop, usar largura bem maior para melhor visualização
        this.container.style.maxWidth = `${Math.floor(containerWidth * 1.8)}px`
      } else {
        // No mobile, manter o tamanho atual
        this.container.style.maxWidth = `${containerWidth}px`
      }

      this.loadingText.textContent = 'Preparando páginas...'
      await this.renderAllPages()

      this.setupNavigation()
      this.setupScrollTracking()
      this.setupSyncedScroll()
      this.hideLoading()
    } catch (error) {
      this.showError(error.message || 'Erro desconhecido')
    }
  }

  async renderAllPages() {
    if (this.isRendering) {
      return
    }

    this.isRendering = true
    this.pagesContainer.innerHTML = ''

    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      await this.renderPage(pageNum)
    }

    this.isRendering = false
  }

  async renderPage(pageNum) {
    try {
      const page = await this.pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1 })
      const baseScale = this.pageHeight / viewport.height
      const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 2), 4)
      const renderScale = baseScale * pixelRatio * 1.5
      const scaledViewport = page.getViewport({ scale: renderScale })

      // Criar wrapper para a página
      const pageWrapper = document.createElement('div')
      pageWrapper.className = 'pdf-page-wrapper'
      pageWrapper.style.marginBottom = `${this.pageGap}px`
      pageWrapper.style.width = '100%'
      pageWrapper.style.display = 'flex'
      pageWrapper.style.justifyContent = 'center'
      pageWrapper.dataset.pageNumber = pageNum

      // Criar canvas
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', {
        alpha: false,
        willReadFrequently: false
      })

      canvas.height = scaledViewport.height
      canvas.width = scaledViewport.width

      // Dimensões visuais
      const displayHeight = this.pageHeight
      const displayWidth = Math.floor(this.pageHeight * A4_RATIO)

      canvas.style.height = `${displayHeight}px`
      canvas.style.width = `${displayWidth}px`
      canvas.style.maxWidth = '100%'
      canvas.style.height = 'auto'
      canvas.className = 'pdf-page-canvas'

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
        intent: 'display',
        enableWebGL: false,
        renderInteractiveForms: false,
        annotationMode: 0
      }

      await page.render(renderContext).promise

      pageWrapper.appendChild(canvas)
      this.pagesContainer.appendChild(pageWrapper)

    } catch (error) {
      console.error('Erro ao renderizar página', pageNum, ':', error)
    }
  }

  setupScrollTracking() {
    // Rastrear qual página está visível durante o scroll
    this.container.addEventListener('scroll', () => {
      this.updateVisiblePage()
      this.updatePdfScrollState()
    })
  }

  updatePdfScrollState() {
    const scrollTop = this.container.scrollTop
    const scrollHeight = this.pagesContainer.scrollHeight
    const clientHeight = this.container.clientHeight
    const maxScroll = scrollHeight - clientHeight

    // Considerar que está no topo se scroll <= 10px
    this.isPdfAtTop = scrollTop <= 10

    // Considerar que está no final se faltam <= 10px para o final
    this.isPdfAtBottom = scrollTop >= maxScroll - 10
  }

  updateVisiblePage() {
    const scrollTop = this.container.scrollTop
    const containerHeight = this.container.clientHeight
    const scrollCenter = scrollTop + (containerHeight / 2)

    const pageWrappers = this.pagesContainer.querySelectorAll('.pdf-page-wrapper')
    let closestPage = 1
    let closestDistance = Infinity

    pageWrappers.forEach((wrapper, index) => {
      const pageTop = wrapper.offsetTop
      const pageHeight = wrapper.offsetHeight
      const pageCenter = pageTop + (pageHeight / 2)
      const distance = Math.abs(scrollCenter - pageCenter)

      if (distance < closestDistance) {
        closestDistance = distance
        closestPage = index + 1
      }
    })

    if (closestPage !== this.currentVisiblePage && closestPage >= 1 && closestPage <= this.totalPages) {
      this.currentVisiblePage = closestPage
    }
  }

  setupSyncedScroll() {
    this.pdfSection = document.getElementById('cardapio')

    // Acumular delta para scroll mais suave
    this.scrollAccumulator = 0
    this.isScrolling = false

    // Listener de wheel na seção inteira
    this.pdfSection.addEventListener('wheel', (e) => {
      // Detectar se o evento é diretamente no container ou nos filhos
      const isDirectlyOnContainer = this.container.contains(e.target)

      // Se o scroll é diretamente no PDF, não fazer nada - deixar nativo
      if (isDirectlyOnContainer) {
        return
      }

      // Se está fora do container, redirecionar o scroll para o PDF
      const delta = e.deltaY
      const isScrollingDown = delta > 0
      const isScrollingUp = delta < 0

      // Verificar limites do PDF
      if (isScrollingDown && !this.isPdfAtBottom) {
        e.preventDefault()
        // Acumular o delta e aplicar com smooth
        this.scrollAccumulator += delta
        this.applySmoothScroll()
      } else if (isScrollingUp && !this.isPdfAtTop) {
        e.preventDefault()
        // Acumular o delta e aplicar com smooth
        this.scrollAccumulator += delta
        this.applySmoothScroll()
      }
    }, { passive: false })
  }

  applySmoothScroll() {
    if (this.isScrolling) return

    this.isScrolling = true
    const targetScroll = this.container.scrollTop + this.scrollAccumulator

    // Reset accumulator
    this.scrollAccumulator = 0

    // Aplicar scroll com comportamento suave mas rápido
    this.container.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    })

    // Resetar flag após um curto delay
    setTimeout(() => {
      this.isScrolling = false
    }, 50)
  }

  setupNavigation() {
    // Navegação por teclado com scroll suave
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        this.scrollByAmount(200)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        this.scrollByAmount(-200)
      }
    })
  }

  scrollByAmount(amount) {
    this.container.scrollBy({
      top: amount,
      behavior: 'smooth'
    })
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
          Por favor, recarregue a página ou verifique sua conexão com a internet.
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

  if (button && menu) {
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
  } catch (error) {
    console.error('Erro ao inicializar aplicação:', error)
  }
})
