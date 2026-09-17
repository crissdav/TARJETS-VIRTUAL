# 🎭 Tarjeta Digital — XV Años de Grecia

Invitacion digital interactiva y animada para la celebracion de XV anos con tema **"Noche de Mascaras"**.

## Datos del Evento

| Campo | Valor |
|---|---|
| Quinceanera | **Grecia Peña** (Grecia Ariana Peña Arteaga) |
| Papá | Miguel Peña Martines |
| Mamá | Loyola Judith Arteaga Gloria |
| Padrino | Juan Carlos Mosaiguate Clemente |
| Madrina | Lesly Grace Vargas Gloria |
| Tema | Noche de Mascaras |
| Fecha | Viernes 27 de Noviembre, 2026 |
| Hora | 7:00 PM |
| Lugar | Por confirmar (demo) |
| RSVP WhatsApp | `917845115` |

## Archivos

| Archivo | Descripcion |
|---|---|
| `index.html` | Estructura HTML con SVGs inline |
| `styles.css` | Estilos, animaciones, responsive |
| `script.js` | Toda la interactividad |
| `qrcode-generator.js` | Libreria QR (Kazuhiko Arase, MIT) |
| `mujer-mascara.svg` | Ilustracion de mujer con mascara de carnaval |
| `hombre-mascara.svg` | Ilustracion de hombre con mascara de carnaval |
| `mascara-icono.svg` | Icono SVG de mascara (usado en badge y notas) |
| `vestido.svg` | Ilustracion SVG de vestido elegante (damas) |
| `esmoquin.svg` | Ilustracion SVG de esmoquin formal (caballeros) |
| `Britney Spears - Baby One More Time (Lyrics).mp3` | Musica de fondo (local, en bucle) |
| `README.md` | Documentacion |

## Secciones de la Tarjeta

### 1. Splash (Pantalla de Inicio)
- Fondo degradado radial oscuro con 60 estrellas animadas
- SVG inline detallado de mascara de carnaval (gradientes dorados, rojos, joya central)
- Anillo de brillo pulsante
- Titulo "MASCARAS" con revelacion letra por letra
- Nombre "Grecia Peña" en Cinzel con shimmer dorado animado
- Frase tagline y boton "Abrir invitacion"

### 2. Sobre (Doble Puerta)
- Sobre con carta crema interior
- Candelabro SVG de 6 brazos con llamas
- Texto "XV ANOS" / "Grecia Peña" / "Noche de Mascaras"
- Dos puertas oscuras con ornamentos SVG dorados filigrana y asas doradas con glow
- Sello dorado con mascara SVG que se rompe al hacer clic
- Las puertas se abren en 3D (rotateY ±110°) con perspective
- **Humo animado** de 3 colores (rojo, dorado y blanco) que **brota del sello al romperse** (clic): puffs que salen del centro y se expanden hacia arriba, generados por `releaseSealSmoke()` y solo en ese momento

### 3. Hero (Principal)
- Nombre "Grecia Peña" en Cinzel con shimmer dorado animado
- "NOCHE DE MASCARAS" con clips de estrellas
- Tarjeta de fecha con 4 esquinas ornamentadas SVG
- **Ilustraciones SVG realistas** de mujer y hombre con mascaras de carnaval
- Indicador de scroll

### 4. Musica de Fondo
- Audio local MP3 (Britney Spears - Baby One More Time) en bucle, **sin depender de internet**
- Arranca cuando la seccion Hero entra en pantalla al hacer scroll (despues de abrir la invitacion)
- Boton flotante inferior derecho `♪` / `⏸`
- Al pausar y reanudar **continua desde donde quedo** (no se reinicia)
- Oculto en impresion

### 5. Cuenta Regresiva
- 4 unidades: dias, horas, minutos, segundos
- **Una sola fila** (`flex-wrap: nowrap`); se compacta en movil
- Animacion flip al cambiar cada numero
- Actualiza cada segundo

### 6. Calendario
- Grilla de Noviembre 2026 (Nov 1 = Domingo, sin offset)
- Celdas centradas (`place-items: center`)
- Dia 27 resaltado con glow rojo pulsante
- Tarjeta glassmorphism

### 7. Itinerario (Timeline)
- 7 eventos de 7:00 PM a 12:00 AM
- Cada evento con icono SVG inline (puerta, estrella, bailarina, plato, musica, pastel, luna)
- Tarjetas glassmorphism compactas con delays escalonados
- Animacion de revelacion al hacer scroll

### 8. Dresscode
- Paleta de colores prohibidos (4 swatches con icono X en hover)
- Tarjeta Damas con SVG externo `vestido.svg` (vestido elegante oscuro con detalles dorados)
- Tarjeta Caballeros con SVG externo `esmoquin.svg` (terno negro con lapela, corbata roja, mascara)
- **Tarjetas con proporciones identicas**: mismo tamaño de tarjeta, imagen (120x150) y espacio de texto
- Contenido del vestido ensanchado en su lienzo para equipararse visualmente al esmoquin
- Frase "Nadie puede ser enganado por siempre con una mascara..." resaltada en dorado claro (+4px, peso 600)

### 9. RSVP (Confirmar Asistencia)
- Formulario: nombre (obligatorio), acompanante (opcional)
- **Codigo QR en vivo**: se genera al instante mientras escribes, actualizandose con cada tecla (igual que la tarjeta del directorio 02)
- El QR contiene el enlace `wa.me/917845115` con mensaje compacto de confirmacion (nombre + acompanante)
- PNG 240px con margen blanco de seguridad (facil de escanear)
- Boton **"Descargar QR"** (aparece antes que el de WhatsApp)
- **iOS/iPhone**: el atributo `download` se ignora. El boton pasa a llamarse **"Guardar QR"** y usa la Web Share API (menu Compartir → "Guardar imagen"); si no esta disponible, se muestra la imagen del QR con la indicacion **"Manten presionada la imagen y elige Guardar en Fotos"** (la imagen es long-pressable)
- Descarga via `canvas.toBlob` + ancla insertada en el DOM (compatible Firefox/Safari/movil); nombre de archivo saneado `qr-grecia-<nombre>.png`
- Boton **"Confirmar por WhatsApp" bloqueado** hasta descargar el QR; al descargarlo se desbloquea y envia el mensaje completo con todos los datos
- Notificacion toast
- Meta Open Graph para compartir en redes

### 10. Footer
- Candelabro SVG con llamas
- Nombre, fecha y tagline

## Paleta de Colores

| Color | Hex | Uso |
|---|---|---|
| Rojo oscuro | `#8B0000` | Acento principal, fondo splash, sello |
| Rojo brillante | `#C41E3A` | SVG swirls, plumas, timeline |
| Dorado | `#D4AF37` | Color decorativo principal, bordes, texto |
| Dorado claro | `#FFD700` | Highlights, SVG gradients |
| Dorado oscuro | `#B8860B` | Trazos SVG, acentos secundarios |
| Blanco | `#FFFFFF` | Texto, perlas, calendario |
| Gris | `#808080` | Texto muted, placeholders |
| Negro | `#0D0D0D` | Ojos de mascaras, fondo base |

## Fuentes (Google Fonts)

| Fuente | CSS Variable | Uso |
|---|---|---|
| **Cinzel** | `--font-display` | Titulos, botones, countdown, calendario |
| **Cormorant Garamond** | `--font-body` | Texto cuerpo, parrafos, formularios, quotes |
| **Cinzel** | `--font-script` | Nombre "Grecia Peña", titulos decorativos |

## Efectos Interactivos

| Efecto | Descripcion |
|---|---|
| Gold dust | 35 particulas doradas flotantes |
| Mask confetti | 20 emojis de mascara cayendo |
| Twinkle stars | 50 estrellas titilantes |
| **BG decor (Hero en adelante)** | Brillo flotante (blobs dorados/rojos difuminados), mascaras flotando (15) y particulas doradas ascendentes (28) que acompanan el scroll |
| Music button | Boton flotante 60px con iconos SVG de nota/pausa y pulso dorado |
| 3D tilt | Efecto inclinacion en tarjetas (solo desktop) |
| Scroll reveal | IntersectionObserver con 25+ elementos animados |
| Countdown flip | Animacion flip en numeros cambiantes |
| Swipe up | Abrir sello con gesto touch en movil |

## Efectos CSS

- **Glassmorphism** en 7 componentes (blur 18px, fondo semi-transparente, borde dorado)
- **15+ keyframe animations** (dustFloat, confettiFall, twinkle, maskFloat, maskReveal, charReveal, fadeUp, pulse, splashHide, sealBreak, bounceDown, calPulse, glowRing, cdFlip, **glowDrift, maskDrift, riseUp, smokeBurst**)
- **Scrollbar personalizado** (6px, thumb dorado)
- **Seleccion de texto** (fondo rojo, texto dorado)
- **Sombras glow** (doradas y rojas)

## Responsive

| Breakpoint | Target |
|---|---|
| `≤ 480px` | Movil: fuentes reducidas, grid 2 columnas comidas |
| `481–768px` | Tablet: tamanos intermedios |
| `769px+` | Desktop: hero horizontal, texto alineado izquierda |
| `1200px+` | Desktop grande: fuentes maximas |
| `320-360px` | Defensas para moviles pequenos: tamaños fijos en SVGs (el headless no emula menos de ~496px) |
| `print` | Oculta overlays/particulas/musica/bg-decor, negro sobre blanco |
| `prefers-reduced-motion` | Desactiva todas las animaciones |

## Dependencias Externas

- Google Fonts (Cinzel, Cormorant Garamond)
- `qrcode-generator.js` (local, MIT)
- `Britney Spears - Baby One More Time (Lyrics).mp3` (local, dentro de la carpeta)
- La musica **no usa YouTube ni internet** (archivo local)

## Flujo de Interaccion

```
Splash (click "Abrir invitacion") → Sobre → Click sello / swipe up
→ Puertas se abren 3D → Contenido principal se revela
→ Al llegar al Hero arranca la musica
→ Scroll por secciones → RSVP: escribir datos → QR en vivo → Descargar QR → Confirmar por WhatsApp
```
