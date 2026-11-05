# Relevamiento de Comercios · Curuzú Cuatiá 2026
### Censo comercial calle por calle — núcleo del sistema

Este paquete contiene la **app de campo** (PWA offline), el **backend** (Google Apps Script + Google Sheets) y la definición del **instrumento de relevamiento**.

---

## 1. Instrumento de relevamiento (la ficha)

Cada comercio se releva con estos campos. Los que ya están en el padrón vienen **precargados** para verificar/corregir.

**Vínculo y estado**
- **Estado del comercio** *(obligatorio)*: Activo · Cerrado (temporal) · Cerrado (definitivo) · Cambió de rubro · No registrado (nuevo) · No existe / baja
- Vínculo con padrón (automático: partida, o "nuevo")

**Datos del comercio**
- Nombre de fantasía · Titular / razón social · CUIT
- Rubro principal (lista del padrón) · Otro rubro (texto libre)
- Calle · Altura · Entre calles

**Ubicación**
- **GPS in situ** *(obligatorio)*: latitud, longitud, precisión y método (GPS / manual / padrón)

**Contacto**
- Teléfono · WhatsApp · Email · Redes / web

**Operación**
- Horario · Días de atención · Cantidad de empleados (rango) · Año de inicio (aprox.)

**Cierre**
- Foto del frente (opcional) · Observaciones
- Metadatos automáticos: encuestador, fecha/hora, zona

---

## 2. Arquitectura

```
App de campo (PWA, teléfono)  ──POST JSON──►  Apps Script (Web App)  ──►  Google Sheets  (hoja "Relevamiento")
      │  offline-first                                                        └──►  Drive (fotos)
      └─ guarda en el teléfono y sincroniza cuando hay señal
```

- **Offline-first**: la app y todo el padrón quedan cacheados; se puede relevar sin señal. Los relevamientos se guardan en el teléfono y se envían al tocar **Sincronizar**.
- **Sin duplicados**: cada ficha tiene un `id`; el backend actualiza si ya existe, o inserta si es nueva.

---

## 3. Desplegar el backend (una sola vez)

1. Crear una planilla nueva en Google Sheets (ej. **"Relevamiento Comercios CC 2026"**).
2. **Extensiones ▸ Apps Script**. Borrar el código de ejemplo y pegar el contenido de **`Codigo.gs`**. Guardar.
3. **Implementar ▸ Nueva implementación ▸ Aplicación web**:
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquiera**
4. Autorizar los permisos y **copiar la URL** que termina en `/exec`.
5. La hoja **"Relevamiento"** y la carpeta de fotos en Drive se crean solas al recibir el primer dato.

> **Al modificar el código** hay que crear una **nueva implementación** (o editar la existente y elegir *Versión: Nueva*) para que los cambios tomen efecto.

---

## 4. Publicar la app (PWA)

Subir estos archivos juntos a un mismo lugar servido por **HTTPS** (ej. GitHub Pages):
`index.html`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`.

- En el teléfono, abrir la URL y **"Agregar a pantalla de inicio"** para instalarla como app.
- La primera vez pide: nombre del encuestador, zona asignada y la **URL del backend** (paso 3.4).
- El GPS y la instalación PWA requieren HTTPS (GitHub Pages ya lo es).

---

## 5. Uso en el campo

1. **Calles**: elegí la calle; ves los comercios del padrón en esa cuadra con su estado (pendiente / relevado). Tocá uno para relevarlo, o **＋ Comercio nuevo** para los que no están.
2. **Ficha**: verificá/corregí los datos, tomá el **GPS** parado frente al local, guardá.
3. **Sincro**: cuando tengas señal, enviá los pendientes. Podés seguir relevando sin conexión.
4. **Mis fichas**: lista de lo que cargaste, con su estado de sincronización.

---

## 6. Hoja de resultados

La hoja **"Relevamiento"** recibe una fila por ficha con todos los campos + `lat`/`lng` + `foto_url`. Desde ahí se cruza con el padrón (por `partida`) para detectar altas, bajas y correcciones.
