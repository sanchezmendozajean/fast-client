import { defineConfig } from 'vitepress';

const REPO = 'https://github.com/sanchezmendozajean/fast-client';
const BASE = '/fast-client/docs/';

// VitePress's default heading slugify, plus Spanish punctuation (¿ ¡ « ») so FAQ anchors stay clean.
const SPECIAL = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/¿¡«»]+/g;
function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(SPECIAL, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase();
}

// User documentation. Built into ../site/docs so the Pages workflow publishes it next to the landing.
export default defineConfig({
  lang: 'es',
  title: 'Fast Client',
  titleTemplate: ':title · Documentación de Fast Client',
  description: 'Guía de uso de Fast Client, el cliente HTTP de escritorio minimalista para Windows.',
  base: BASE,
  outDir: '../site/docs',
  cleanUrls: true,
  appearance: true,

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${BASE}icon.png` }],
    ['meta', { name: 'theme-color', content: '#0f1115' }],
  ],

  markdown: {
    anchor: { slugify },
    // The docs are full of literal {{variables}}: keep Vue from interpolating inline code.
    config(md) {
      const codeInline = md.renderer.rules.code_inline!;
      md.renderer.rules.code_inline = (...args) => codeInline(...args).replace(/^<code/, '<code v-pre');
    },
    container: {
      tipLabel: 'Consejo',
      infoLabel: 'Información',
      warningLabel: 'Atención',
      dangerLabel: 'Cuidado',
      detailsLabel: 'Detalles',
    },
  },

  themeConfig: {
    logo: '/icon.png',
    siteTitle: 'Fast Client',

    nav: [
      { text: 'Inicio', link: 'https://sanchezmendozajean.github.io/fast-client/', target: '_self' },
      { text: 'Guía', link: '/', activeMatch: '^/(?!atajos|preguntas-frecuentes)'},
      { text: 'Descargar', link: `${REPO}/releases/latest` },
    ],

    sidebar: [
      {
        text: 'Primeros pasos',
        items: [
          { text: 'Introducción', link: '/' },
          { text: 'La interfaz', link: '/interfaz' },
        ],
      },
      {
        text: 'Trabajar con requests',
        items: [
          { text: 'Colecciones y requests', link: '/colecciones' },
          { text: 'Hacer una petición', link: '/peticiones' },
          { text: 'Variables', link: '/variables' },
          { text: 'La respuesta', link: '/respuesta' },
          { text: 'cURL', link: '/curl' },
        ],
      },
      {
        text: 'Tu trabajo',
        items: [
          { text: 'Archivos de perfil', link: '/perfiles' },
          { text: 'Preferencias y actualizaciones', link: '/preferencias' },
        ],
      },
      {
        text: 'Referencia',
        items: [
          { text: 'Atajos de teclado', link: '/atajos' },
          { text: 'Preguntas frecuentes', link: '/preguntas-frecuentes' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: REPO, ariaLabel: 'Código en GitHub' }],

    editLink: {
      pattern: `${REPO}/edit/main/site-docs/:path`,
      text: 'Editar esta página en GitHub',
    },

    footer: {
      message: `Licencia MIT · <a href="${REPO}/issues">Reportar un problema</a>`,
      copyright: 'Hecho por Jean Sánchez Mendoza',
    },

    outline: { level: [2, 3], label: 'En esta página' },
    docFooter: { prev: 'Anterior', next: 'Siguiente' },
    darkModeSwitchLabel: 'Apariencia',
    lightModeSwitchTitle: 'Cambiar a tema claro',
    darkModeSwitchTitle: 'Cambiar a tema oscuro',
    sidebarMenuLabel: 'Menú',
    returnToTopLabel: 'Volver arriba',
    externalLinkIcon: true,
    notFound: {
      title: 'Página no encontrada',
      quote: 'Esta página no existe o cambió de dirección.',
      linkLabel: 'Ir al inicio de la documentación',
      linkText: 'Ir al inicio',
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar en la documentación' },
          modal: {
            displayDetails: 'Mostrar detalles',
            resetButtonTitle: 'Borrar la búsqueda',
            backButtonTitle: 'Cerrar la búsqueda',
            noResultsText: 'Sin resultados para',
            footer: {
              selectText: 'abrir',
              selectKeyAriaLabel: 'Enter',
              navigateText: 'moverse',
              navigateUpKeyAriaLabel: 'Flecha arriba',
              navigateDownKeyAriaLabel: 'Flecha abajo',
              closeText: 'cerrar',
              closeKeyAriaLabel: 'Esc',
            },
          },
        },
      },
    },
  },
});
