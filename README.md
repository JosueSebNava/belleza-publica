# Elohim Estudio de uñas y pestañas

Proyecto web separado para editar en VS Code.

## Estructura

```txt
luna-atelier-beauty/
├── frontend/
│   ├── index.html        # HTML: estructura, textos, formularios y catálogo
│   ├── styles.css        # CSS: diseño elegante rosa/dorado y responsive
│   ├── app.js            # JavaScript cliente: botones, modal, fetch y agenda
│   ├── assets/brand/     # Logo y favicon de Elohim
│   └── assets/catalog/   # Fotografías optimizadas del catálogo y carrusel
├── backend/
│   ├── server.js         # Node.js: servidor, rutas API y lógica principal
│   ├── auth.js           # Seguridad: contraseñas, tokens y sesión
│   ├── database.js       # Conexión a base de datos JSON local
│   └── data/
│       └── database.json # Base de datos demo: usuarios, citas y sesiones
├── package.json          # Scripts para ejecutar el proyecto
├── vercel.json           # Configuración para Vercel
├── render.yaml           # Configuración para Render
├── api/index.js          # Entrada serverless para Vercel
└── server.js             # Entrada principal del backend
```

## Cómo trabajan juntos frontend y backend

### Frontend: lado del cliente

Se ejecuta en el dispositivo del usuario.

- `frontend/index.html`: muestra el contenido visible de la página.
- `frontend/styles.css`: aplica colores, tipografía, catálogo, tarjetas y diseño elegante.
- `frontend/app.js`: hace que los botones funcionen, abre ventanas de login, guarda datos en el navegador y llama al backend con `fetch()`.
- `frontend/assets/catalog/`: contiene las imágenes optimizadas en WebP para carga rápida.

Ejemplo: cuando el cliente pulsa `Confirmar cita`, el frontend toma los datos del formulario y los envía a:

```txt
POST /api/appointments
```

### Backend: lado del servidor

Se ejecuta en Node.js y el usuario no ve su lógica interna.

- `backend/server.js`: recibe peticiones del frontend y decide qué hacer.
- `backend/auth.js`: valida contraseña, crea tokens y protege rutas privadas.
- `backend/database.js`: lee y escribe información en la base de datos local.
- `backend/data/database.json`: guarda clientes, citas y sesiones demo.

Ejemplo: cuando llega una cita, el backend verifica que el usuario inició sesión, guarda la cita en la base de datos y prepara el recordatorio por correo en modo demo.

## Funciones agregadas

- Carrusel profesional en la página principal.
- Catálogo dividido en `Uñas` y `Pestañas`.
- Fotografías reales integradas y optimizadas.
- Botón `Reservar por WhatsApp` en servicios y modelos.
- Mapa embebido de Google Maps con la ubicación real del local.
- Animaciones al hacer scroll.
- Diseño responsive para celulares y computadoras.
- Configuración incluida para Vercel y Render.

## Qué editar

- Cambios visuales: `frontend/styles.css`
- Textos, secciones, catálogo y formularios: `frontend/index.html`
- Funciones del navegador: `frontend/app.js`
- Login, citas, usuarios y endpoints: `backend/server.js`
- Seguridad de usuarios: `backend/auth.js`
- Base de datos local: `backend/database.js` y `backend/data/database.json`
- Número de WhatsApp: `frontend/app.js`, constante `WHATSAPP_PHONE`
- Dirección y mapa: sección `ubicacion` en `frontend/index.html`

## Ubicación configurada

```txt
Benito Juárez 284, San Miguel Acambay,
50305 Villa de Acambay de Ruíz Castañeda, Méx.
```

## Ejecutar

```bash
npm start
```

La app usa el puerto `3000`.

## Despliegue

El proyecto incluye:

- `vercel.json` y `api/index.js` para Vercel.
- `render.yaml` para Render.

La base de datos incluida es JSON demo. Para producción con muchos clientes conviene conectar MySQL, PostgreSQL, MongoDB o un servicio similar.

## Acceso demo del local

```txt
Correo: staff@local.com
Contraseña: Local1234
```

## Nota

Google/Facebook y el envío real de correos están simulados. Para producción se deben conectar credenciales reales de OAuth y un proveedor de email.
