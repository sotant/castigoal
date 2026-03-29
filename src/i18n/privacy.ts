import { createNamespaceProxy } from '@/src/i18n/runtime';

export const privacyResources = {
  es: {
    hero: {
      text: 'Esta política resume qué datos trata la app, por qué los necesita y cómo puede el usuario pedir su borrado.',
      title: 'Castigoal',
    },
    notice: {
      body:
        'Si publicas la app en Google Play, sustituye este texto por tu correo real de soporte y publica esta misma política en una URL accesible desde la ficha de Play Store.',
      title: 'Contacto y borrado',
    },
    screen: {
      subtitle: 'Versión 1.0. Vigente desde el 11 de marzo de 2026.',
      title: 'Política de privacidad',
    },
    sections: [
      {
        title: 'Datos que usamos',
        body:
          'Castigoal usa tu correo de acceso, tu perfil básico, tus objetivos, check-ins, castigos personalizados, castigos asignados y ajustes de recordatorios para prestar el servicio.',
      },
      {
        title: 'Para qué se usan',
        body:
          'Estos datos se usan para autenticar tu cuenta, sincronizar tu progreso entre sesiones, calcular estadísticas, asignar consecuencias y enviarte recordatorios locales en tu dispositivo.',
      },
      {
        title: 'Dónde se almacenan',
        body:
          'La autenticación y la base de datos se alojan en Supabase. La sesión del usuario se guarda de forma segura en el dispositivo mediante Secure Store cuando está disponible.',
      },
      {
        title: 'Compartición',
        body:
          'Castigoal no vende tus datos. Solo se comparten con los proveedores técnicos necesarios para operar la app, como Supabase para autenticación y base de datos.',
      },
      {
        title: 'Tus controles',
        body:
          'Puedes actualizar tus datos desde la app, vaciar tus registros y borrar tu cuenta completa desde Ajustes. Al borrar la cuenta, se eliminan tu perfil y tus datos asociados.',
      },
    ],
  },
  en: {
    hero: {
      text: 'This policy summarizes what data the app processes, why it needs it, and how the user can request deletion.',
      title: 'Castigoal',
    },
    notice: {
      body:
        'If you publish the app on Google Play, replace this text with your real support email and publish this same policy at a URL accessible from the Play Store listing.',
      title: 'Contact and deletion',
    },
    screen: {
      subtitle: 'Version 1.0. Effective March 11, 2026.',
      title: 'Privacy policy',
    },
    sections: [
      {
        title: 'Data we use',
        body:
          'Castigoal uses your sign-in email, your basic profile, goals, check-ins, custom punishments, assigned punishments, and reminder settings to provide the service.',
      },
      {
        title: 'What it is used for',
        body:
          'This data is used to authenticate your account, sync your progress across sessions, calculate statistics, assign consequences, and send local reminders on your device.',
      },
      {
        title: 'Where it is stored',
        body:
          'Authentication and the database are hosted on Supabase. The user session is stored securely on the device with Secure Store when available.',
      },
      {
        title: 'Sharing',
        body:
          'Castigoal does not sell your data. It is only shared with technical providers needed to operate the app, such as Supabase for authentication and database services.',
      },
      {
        title: 'Your controls',
        body:
          'You can update your data from the app, clear your records, and delete your full account from Settings. Deleting the account removes your profile and associated data.',
      },
    ],
  },
} as const;

export const privacyCopy = createNamespaceProxy('privacy', privacyResources.es);
