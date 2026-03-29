# Multilenguaje en Castigoal

## Dónde va cada cosa

- Todo el copy visible del sistema debe vivir en `src/i18n/`.
- Los textos del usuario no se traducen: nombres de objetivos, descripciones propias, feedback libre y cualquier contenido escrito por la persona usuaria.
- Los catálogos de sistema deben identificarse con claves estables y resolver el texto visible por idioma.

## Reglas de dominio

- Categorías de castigo: usar siempre `PunishmentCategoryName` como clave interna.
- Categorías de feedback: usar siempre `FeedbackCategoryId` como valor persistido y traducir solo la etiqueta.
- Castigos base: la identidad estable es el `id` del catálogo (`punish-*`), no el `title` ni la `description`.
- Castigos personalizados: sí conservan el texto escrito por la persona usuaria.

## Cómo añadir un idioma nuevo

1. Añadir el idioma en `src/i18n/config.ts`.
2. Añadir sus recursos en `src/i18n/resources.ts`.
3. Completar los namespaces existentes dentro de `src/i18n/`.
4. Revisar textos que dependan de locale en fechas, calendario, tutoriales y notificaciones.
5. Probar cambio manual, persistencia, fallback y pantallas clave.

## Cómo evitar regresiones

- No usar texto visible como valor interno de negocio.
- No persistir copy localizada para entidades de sistema si existe una clave estable.
- Antes de cerrar cambios de UI o dominio, ejecutar `npm run qa:i18n`.
- Si un literal visible es intencional y no debe pasar por i18n, documentarlo en la misma línea con `i18n-check ignore`.
