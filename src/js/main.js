import '../styles/style.css'

// Script principal para index.html (apenas menu mobile e smooth scroll)

// Mobile Menu
function setupMobileMenu() {
  const button = document.getElementById('mobile-menu-button')
  const menu = document.getElementById('mobile-menu')

  if (!button || !menu) return

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

// Smooth scroll para links âncora
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href')
      if (href === '#') return

      e.preventDefault()
      const target = document.querySelector(href)
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    })
  })
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu()
  setupSmoothScroll()
})

