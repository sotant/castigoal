# Publicar Castigoal en Google Play

## 1. Configuracion del proyecto

- `app.json` ya define `android.package = com.castigoal.app`.
- `app.json` ya define `android.versionCode = 1`.
- `eas.json` ya incluye perfiles `preview` y `production`.

Antes del primer envio:

1. Instala y autentica `eas-cli`.
2. Ejecuta `eas init` para vincular el proyecto a tu cuenta Expo y guardar el `projectId` si Expo lo solicita.
3. Sube las variables de entorno de produccion a EAS:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Genera un build interno para pruebas:
   - `npm run build:android:preview`
5. Genera el AAB de produccion:
   - `npm run build:android`

## 2. Que revisar antes de subir

- Login y registro con Supabase.
- Onboarding completo.
- Crear, editar y borrar objetivos.
- Registrar check-ins.
- Castigos asignados y completados.
- Notificaciones locales en una build Android real.
- Reset de datos.
- Eliminacion completa de cuenta.

## 3. Google Play Console

Prepara estos materiales:

- Nombre visible final de la app.
- Descripcion corta y descripcion completa.
- Categoria.
- Email de soporte.
- Icono de alta resolucion.
- Capturas de pantalla de movil.
- Banner grafico si Google Play lo solicita para tu ficha.

## 4. Politica de privacidad

Play Store te pedira una URL publica. El repo ya incluye:

- `app/privacy.tsx` para una version navegable dentro de la app y exportable en web.
- `docs/privacy-policy.md` como texto base editable.

Publica ese contenido en una URL accesible desde Internet antes de enviar la ficha.

## 5. Data safety recomendado

Declara al menos:

- Email de usuario.
- Identificadores de cuenta.
- Datos introducidos por el usuario: objetivos, check-ins, castigos personalizados y ajustes.
- Notificaciones locales para recordatorios.

## 6. Supabase en produccion

- Aplica las migraciones de `supabase/migrations`.
- Despliega la Edge Function `delete-account`.
- Verifica en Auth:
  - confirmacion de email
  - plantillas de correo
  - URL del sitio y redirecciones
- No metas `service_role` en la app. Solo usa la clave publishable.
