# Castigoal

App movil de disciplina personal construida con React Native, Expo y TypeScript. El MVP permite crear objetivos, registrar check-ins diarios, evaluar cumplimiento sobre una ventana de dias objetivo y asignar castigos aleatorios cuando el usuario cae por debajo del minimo definido.

## Stack

- Expo Router sobre React Navigation
- React Native + TypeScript estricto
- Zustand para estado global
- AsyncStorage para cache auxiliar local
- Supabase Auth + Postgres para autenticacion y backend remoto
- Expo Notifications para recordatorios diarios
- Expo Secure Store para persistencia segura de sesion

## Arquitectura

```text
app
  (tabs)
  checkin
  goals
  punishments
src
  components
  constants
  features
  hooks
  lib
  models
  navigation
  providers
  screens
  services
  store
  utils
supabase
  functions
  migrations
```

### Capas

- `app/`: rutas y composicion de navegacion con Expo Router.
- `src/screens/`: pantallas sin logica de persistencia.
- `src/components/`: piezas UI reutilizables.
- `src/store/`: estado global y acciones del dominio.
- `src/lib/`: cliente y tipos de Supabase.
- `src/providers/`: contexto de autenticacion.
- `src/utils/`: reglas de negocio y helpers puros.
- `src/services/`: adaptadores de almacenamiento y notificaciones.
- `supabase/functions/`: funciones seguras del lado servidor.

## Modelos principales

- `User`
- `Goal`
- `Checkin`
- `Punishment`
- `AssignedPunishment`
- `UserSettings`

Se definen en [src/models/types.ts](./src/models/types.ts).

## Flujo del producto

1. Onboarding rapido.
2. Crear objetivo con dias objetivo y minimo requerido.
3. Hacer check-in diario.
4. Evaluar cumplimiento sobre la ventana actual.
5. Si el porcentaje cae por debajo del minimo, asignar castigo aleatorio.
6. Completar castigo y revisar estadisticas e historial.

## Funciones clave de negocio

Se implementan en [src/utils/goal-evaluation.ts](./src/utils/goal-evaluation.ts):

- `calculateCompletionRate`
- `getGoalCheckins`
- `evaluateGoalPeriod`
- `generateRandomPunishment`
- `assignPunishment`
- `completePunishment`
- `getCurrentStreak`
- `getBestStreak`

## Ejecutar el proyecto

```bash
npm install
npx expo start
```

Atajos:

- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run build:android:preview`
- `npm run build:android`

## Notas del MVP

- La evaluacion usa una ventana movil de `targetDays`, respetando la `startDate` del objetivo.
- La autenticacion por email/password ya esta preparada con Supabase.
- La base remota de Supabase ya incluye `profiles`, `user_settings`, `goals`, `checkins`, `punishments`, `assigned_punishments` y `goal_period_outcomes` con RLS.
- El estado de dominio se hidrata desde Supabase y Zustand actua como cache y capa de UI.
- Las notificaciones se programan al hidratar el store y al cambiar ajustes.
- La app incluye una ruta publica `/privacy` y un flujo de eliminacion completa de cuenta.

## Publicacion Android

- `app.json` incluye `android.package` y `versionCode`.
- `eas.json` incluye perfiles `preview` y `production`.
- Existe una Edge Function `delete-account` para cumplir el borrado de cuenta exigido por Google Play.
- La politica de privacidad base vive en `docs/privacy-policy.md` y la app expone una ruta `app/privacy.tsx`.

Guia operativa:

- `docs/google-play-release.md`

## Siguientes pasos recomendados

1. Publicar la politica de privacidad en una URL publica real.
2. Configurar `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en EAS.
3. Desplegar la Edge Function `delete-account` en Supabase.
4. Anadir deep linking para recuperacion de password y verificacion de email si quieres una experiencia movil completa.
5. Incorporar tests unitarios para `goal-evaluation` y tests de pantalla.
