# Castigoal

Castigoal es una aplicacion de disciplina personal desarrollada con Expo y React Native. Su proposito es ayudar al usuario a definir objetivos, registrar su avance diario, medir el cumplimiento dentro de una ventana de tiempo y aplicar castigos cuando no se alcanza el minimo configurado.

El proyecto esta planteado con un enfoque `local-first`, por lo que la app puede funcionar en modo invitado desde el dispositivo y sincronizarse despues con Supabase cuando el usuario crea una cuenta o inicia sesion.

## Descripcion general del proyecto

La aplicacion gira alrededor de cinco bloques funcionales:

- creacion y seguimiento de objetivos personales;
- registro de check-ins diarios como completado o fallado;
- evaluacion automatica del progreso segun dias objetivo y porcentaje minimo de exito;
- asignacion y gestion de castigos pendientes;
- sincronizacion de datos, onboarding, autenticacion y ajustes del usuario.

Castigoal no es solo una app CRUD. Tambien incorpora reglas de negocio para calcular progreso, rachas, periodos de evaluacion, resultados de objetivos y recordatorios locales.

## Stack tecnologico utilizado

### Frontend y aplicacion movil

- `Expo 54`
- `React 19`
- `React Native 0.81`
- `TypeScript 5`
- `Expo Router` para rutas y navegacion
- `React Navigation` para la navegacion por tabs y stacks

### Estado, almacenamiento y experiencia local

- `Zustand` para estado global y orquestacion
- `AsyncStorage` para persistencia local
- `Expo Secure Store` para almacenamiento seguro
- `Expo Notifications` para recordatorios locales

### Backend y servicios

- `Supabase Auth` para autenticacion
- `Supabase Postgres` como backend de datos
- `Supabase Edge Functions` para operaciones como borrado de cuenta
- `SQL migrations` dentro de `supabase/migrations`

### Calidad y tooling

- `Jest` y `jest-expo` para tests
- `ESLint` con `eslint-config-expo`
- `EAS Build / EAS Submit` para builds y distribucion Android

## Estructura del proyecto

La organizacion principal del repositorio es la siguiente:

```text
app/
  (tabs)/
  goals/
  punishments/
  _layout.tsx
  auth.tsx
  onboarding.tsx
  privacy.tsx
  reset-password.tsx

src/
  components/
  config/
  constants/
  contracts/
  features/
  hooks/
  lib/
  models/
  navigation/
  providers/
  repositories/
  screens/
  services/
  store/
  types/
  use-cases/
  utils/

supabase/
  functions/
  migrations/

__tests__/
android/
assets/
docs/
legal-site/
scripts/
```

### Que contiene cada bloque

- `app/`: rutas y composicion de navegacion con Expo Router.
- `src/screens/`: pantallas principales de la aplicacion.
- `src/components/`: componentes reutilizables de interfaz.
- `src/store/`: estado global con Zustand.
- `src/use-cases/`: acciones de aplicacion orientadas al dominio.
- `src/services/`: persistencia local, notificaciones, tutorial y orquestacion operativa.
- `src/repositories/`: acceso a servicios remotos y backend.
- `src/utils/`: reglas de negocio puras y helpers reutilizables.
- `src/models/` y `src/contracts/`: tipos del dominio y modelos derivados para la UI.
- `supabase/`: backend, migraciones y funciones de servidor.
- `__tests__/`: pruebas unitarias y de logica funcional.
- `legal-site/`: paginas estaticas relacionadas con privacidad y borrado de cuenta.

## Funcionalidades principales

- Gestion de objetivos personales con creacion, edicion y seguimiento.
- Registro diario del estado de cada objetivo como completado o fallado.
- Calculo automatico de progreso, dias cumplidos, dias requeridos y rachas.
- Evaluacion del cumplimiento dentro de una ventana temporal configurada.
- Asignacion de castigos cuando el objetivo no alcanza el minimo esperado.
- Historial y seguimiento de castigos pendientes o completados.
- Modo invitado con persistencia local desde el primer uso.
- Registro e inicio de sesion para sincronizar datos con Supabase.
- Recordatorios locales configurables desde ajustes.
- Onboarding inicial y tutorial guiado dentro de la app.
- Envio de sugerencias y reporte de errores desde la propia interfaz.
- Politica de privacidad y flujo de eliminacion de cuenta.
