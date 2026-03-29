import { PunishmentCategoryName } from '@/src/models/types';
import { createNamespaceProxy, translate, translateObject } from '@/src/i18n/runtime';

export const punishmentResources = {
  es: {
    categoryCopy: {
      entretenimiento: {
        description: 'Límites al ocio, pantallas y consumo recreativo.',
        label: 'Entretenimiento',
      },
      estudio: {
        description: 'Lectura, escritura, repaso y aprendizaje con foco.',
        label: 'Estudio',
      },
      finanzas: {
        description: 'Costes económicos o renuncias con impacto monetario.',
        label: 'Finanzas',
      },
      fisico: {
        description: 'Movimiento, resistencia y retos corporales.',
        label: 'Físico',
      },
      hogar: {
        description: 'Limpieza, orden y mantenimiento doméstico.',
        label: 'Hogar',
      },
      nutricion: {
        description: 'Comidas, hidratación y decisiones alimentarias.',
        label: 'Nutrición',
      },
      otros: {
        description: 'Categoría comodín para casos no previstos o mixtos.',
        label: 'Otros',
      },
      salud: {
        description: 'Descanso, movilidad, higiene del sueño y bienestar.',
        label: 'Salud',
      },
      social: {
        description: 'Interacciones, favores y compromisos con otras personas.',
        label: 'Social',
      },
      tarea: {
        description: 'Recados rápidos, orden de pendientes y pequeñas obligaciones.',
        label: 'Tarea',
      },
      trabajo: {
        description: 'Bloques profundos, ejecución y tareas profesionales.',
        label: 'Trabajo',
      },
    },
    difficultyCopy: {
      1: {
        description: 'Rápida de cumplir y perfecta para castigos cotidianos.',
        label: 'Ligera',
      },
      2: {
        description: 'Exige esfuerzo real y deja huella durante el día.',
        label: 'Media',
      },
      3: {
        description: 'Más dura, pensada para fallos importantes.',
        label: 'Alta',
      },
    },
    baseCatalog: [
      { categoryName: 'entretenimiento', description: 'Pasa 30 minutos sin abrir redes sociales.', difficulty: 1, id: 'punish-no-social', title: 'Sin redes sociales' },
      { categoryName: 'fisico', description: 'Completa una caminata de al menos 8000 pasos hoy.', difficulty: 1, id: 'punish-steps', title: 'Camina 8000 pasos' },
      { categoryName: 'trabajo', description: 'Deja tu zona de trabajo limpia y ordenada.', difficulty: 1, id: 'punish-desk', title: 'Ordena el escritorio' },
      { categoryName: 'estudio', description: 'Lee 20 páginas de un libro útil o formativo.', difficulty: 1, id: 'punish-read', title: 'Leer 20 páginas' },
      { categoryName: 'salud', description: 'Pasa la última hora del día sin móvil ni ordenador.', difficulty: 1, id: 'punish-no-screens', title: 'Dormir sin pantallas' },
      { categoryName: 'fisico', description: 'Completa 50 flexiones en una sola tanda o en series.', difficulty: 2, id: 'punish-pushups', title: '50 flexiones' },
      { categoryName: 'hogar', description: 'Ordena y limpia por completo una habitación de tu casa.', difficulty: 2, id: 'punish-clean-room', title: 'Limpia una habitación' },
      { categoryName: 'finanzas', description: 'Haz una donación de 5 EUR a una causa que apoyes.', difficulty: 2, id: 'punish-donate-5', title: 'Donar 5 EUR' },
      { categoryName: 'salud', description: 'Mantén una mañana completa sin café ni bebidas energéticas.', difficulty: 2, id: 'punish-no-coffee', title: 'Sin café por la mañana' },
      { categoryName: 'nutricion', description: 'Cocina una comida completa y saludable en casa.', difficulty: 2, id: 'punish-cook', title: 'Preparar comida sana' },
      { categoryName: 'estudio', description: 'Escribe 300 palabras sobre por qué fallaste y qué harás distinto.', difficulty: 2, id: 'punish-journal', title: 'Escribir reflexión' },
      { categoryName: 'fisico', description: 'Haz una plancha acumulada de 3 minutos.', difficulty: 2, id: 'punish-plank', title: 'Plancha de 3 minutos' },
      { categoryName: 'trabajo', description: 'Haz 45 minutos de trabajo profundo sin interrupciones.', difficulty: 3, id: 'punish-deep-work', title: 'Bloque profundo' },
      { categoryName: 'fisico', description: 'Completa una carrera continua o combinada de 5 kilómetros.', difficulty: 3, id: 'punish-run', title: 'Correr 5 km' },
      { categoryName: 'hogar', description: 'Haz una limpieza a fondo de la cocina o del baño.', difficulty: 3, id: 'punish-kitchen', title: 'Limpieza profunda de cocina' },
      { categoryName: 'finanzas', description: 'Haz una donación de 15 EUR a una causa que apoyes.', difficulty: 3, id: 'punish-donate-15', title: 'Donar 15 EUR' },
      { categoryName: 'entretenimiento', description: 'Pasa 48 horas sin series, películas ni vídeos de ocio.', difficulty: 3, id: 'punish-no-streaming', title: 'Sin streaming durante 48 h' },
      { categoryName: 'salud', description: 'Completa 40 minutos de movilidad, estiramientos o yoga.', difficulty: 3, id: 'punish-mobility', title: 'Sesión de movilidad de 40 min' },
      { categoryName: 'tarea', description: 'Resuelve o archiva todos los pendientes pequeños acumulados.', difficulty: 3, id: 'punish-inbox-zero', title: 'Vaciar bandeja pendiente' },
      { categoryName: 'hogar', description: 'Pon una lavadora y deja toda la ropa doblada y guardada.', difficulty: 2, id: 'punish-laundry', title: 'Lavar y doblar ropa' },
    ],
    form: {
      accessibility: {
        categoryInfo: 'Ver información sobre la categoría {{label}}',
        difficultyInfo: 'Ver información sobre la dificultad {{label}}',
      },
      buttons: {
        saveChanges: 'Guardar cambios',
      },
      createTitle: 'Crear castigo',
      editTitle: 'Editar castigo',
      fields: {
        description: 'Descripción',
        title: 'Título del castigo',
      },
      loading: {
        description: 'Estoy recuperando el castigo para que puedas editarlo sin sobrescribir datos.',
        title: 'Preparando el formulario',
      },
      missing: {
        description: 'No he encontrado ese castigo personalizado para editarlo.',
        title: 'Castigo no disponible',
      },
      placeholders: {
        description: 'Recoger y ordenar toda la habitación',
        title: 'Ordenar la habitación',
      },
      preview: {
        emptyDescription: 'Sin descripción. Puedes dejarlo así o dar más detalle para que resulte más claro al cumplirlo.',
        emptyTitle: 'Tu castigo todavía no tiene título',
        eyebrow: 'Vista previa',
      },
      sections: {
        category: 'Elige una categoría',
        difficulty: 'Selecciona la dificultad',
        identity: 'Identidad del castigo',
      },
      submitError: 'No se pudo guardar el castigo.',
      titleError: 'Escribe un título de al menos 3 caracteres.',
      unsavedChanges: {
        createDescription: 'Se perderá la información que has escrito para este castigo.',
        createTitle: 'Descartar borrador',
        editDescription: 'Se perderán los cambios que has hecho en este castigo.',
        editTitle: 'Descartar cambios',
        keepEditing: 'Seguir editando',
      },
    },
    history: {
      actions: {
        complete: 'Completar',
        new: 'Nuevo',
      },
      accessibility: {
        completedPunishmentInfo: 'Ver información del castigo cumplido',
        createPunishmentHint: 'Abre la pantalla para crear un castigo',
        createPunishmentLabel: 'Agregar castigo',
        pendingGoalInfo: 'Ver información del objetivo',
        punishmentActions: 'Muestra más acciones para este castigo',
        punishmentActionsLabel: 'Abrir menú de {{title}}',
        toggleCompletedHide: 'Oculta',
        toggleCompletedShow: 'Muestra',
        toggleCompletedLabel: 'Alternar castigos cumplidos',
        toggleCompletedSection: '{{action}} la sección de castigos cumplidos',
      },
      completeConfirmationTitle: '¿Has cumplido el castigo?',
      completedOn: 'Cumplido el {{dateLabel}}',
      deleteConfirmation: {
        confirm: 'Borrar',
        description: 'El servidor bloqueará el borrado si este castigo ya fue asignado para conservar el historial.',
        eyebrow: 'Eliminar castigo',
        title: 'Borrar castigo',
      },
      detailModal: {
        date: 'Fecha',
        description: 'Descripción',
        fallbackDescription: 'Castigo completado.',
        fallbackTitle: 'Castigo',
        noDescription: 'Sin descripción disponible.',
        relatedGoal: 'Objetivo relacionado',
        relatedGoalFallback: 'Sin objetivo relacionado',
        title: 'Título',
        titleLabel: 'Detalle del castigo',
      },
      empty: {
        filteredLibraryMessage: 'Prueba con otra combinación o limpia los filtros activos.',
        filteredLibraryTitle: 'No hay castigos que coincidan con los filtros',
        historyMessage: 'Cuando confirmes un castigo como cumplido, se guardará aquí con su fecha.',
        historyTitle: 'Sin castigos cumplidos',
        libraryMessage: 'Crea tu primer castigo para empezar a construir tu biblioteca.',
        libraryTitle: 'Todavía no hay castigos',
        mineSuccessTitle: 'No tienes castigos pendientes. Buen trabajo.',
      },
      filters: {
        category: 'Categoría',
        clearAll: 'Limpiar filtros',
        difficulty: 'Dificultad',
        libraryTitle: 'Refina la biblioteca',
        origin: 'Origen',
        searchPlaceholder: 'Nombre o descripción',
        sectionTitle: 'Filtros',
      },
      infoModal: {
        title: 'Información',
        unmetGoalLabel: 'No cumpliste: ',
      },
      labels: {
        base: 'Base',
        completed: 'Cumplidos',
        library: 'Biblioteca',
        mine: 'Mis castigos',
        pending: 'Pendientes',
        personal: 'Personal',
        screenTitle: 'Castigos',
        standard: 'Estándar',
      },
      libraryStats: {
        mine: 'Mis castigos',
        standard: 'Estándar',
      },
      pagination: {
        next: 'Siguiente',
        page: 'Página {{current}} de {{total}}',
        previous: 'Anterior',
      },
    },
    modal: {
      button: 'Entendido',
      emptyDescription: 'Configura un castigo para reforzar el sistema.',
      emptyTitle: 'Sin castigo disponible',
      eyebrow: 'Consecuencia generada',
    },
    repository: {
      catalogLoadFailed: 'No se pudo cargar el catálogo de castigos.',
      createFailed: 'No se pudo guardar el castigo personalizado.',
      deleteFailed: 'No se pudo borrar el castigo personalizado.',
      historyLoadFailed: 'No se pudo cargar el historial de castigos cumplidos.',
      loadFailed: 'No se pudo cargar el castigo.',
      pendingLoadFailed: 'No se pudieron cargar los castigos pendientes.',
      updateFailed: 'No se pudo actualizar el castigo personalizado.',
    },
  },
  en: {
    categoryCopy: {
      entretenimiento: { description: 'Limits on leisure, screens, and entertainment.', label: 'Entertainment' },
      estudio: { description: 'Reading, writing, review, and focused learning.', label: 'Study' },
      finanzas: { description: 'Costs or trade-offs with a financial impact.', label: 'Finance' },
      fisico: { description: 'Movement, endurance, and physical challenges.', label: 'Physical' },
      hogar: { description: 'Cleaning, order, and home maintenance.', label: 'Home' },
      nutricion: { description: 'Meals, hydration, and nutrition decisions.', label: 'Nutrition' },
      otros: { description: 'Catch-all category for mixed or unexpected cases.', label: 'Other' },
      salud: { description: 'Rest, mobility, sleep hygiene, and well-being.', label: 'Health' },
      social: { description: 'Interactions, favors, and commitments with other people.', label: 'Social' },
      tarea: { description: 'Quick errands, pending tasks, and small obligations.', label: 'Task' },
      trabajo: { description: 'Deep work blocks, execution, and professional tasks.', label: 'Work' },
    },
    difficultyCopy: {
      1: { description: 'Quick to complete and perfect for everyday punishments.', label: 'Light' },
      2: { description: 'Requires real effort and leaves a mark on the day.', label: 'Medium' },
      3: { description: 'Harder, designed for major failures.', label: 'High' },
    },
    baseCatalog: [
      { categoryName: 'entretenimiento', description: 'Spend 30 minutes without opening social media.', difficulty: 1, id: 'punish-no-social', title: 'No social media' },
      { categoryName: 'fisico', description: 'Complete a walk of at least 8000 steps today.', difficulty: 1, id: 'punish-steps', title: 'Walk 8000 steps' },
      { categoryName: 'trabajo', description: 'Leave your workspace clean and tidy.', difficulty: 1, id: 'punish-desk', title: 'Tidy your desk' },
      { categoryName: 'estudio', description: 'Read 20 pages of a useful or educational book.', difficulty: 1, id: 'punish-read', title: 'Read 20 pages' },
      { categoryName: 'salud', description: 'Spend the last hour of the day without your phone or computer.', difficulty: 1, id: 'punish-no-screens', title: 'Sleep without screens' },
      { categoryName: 'fisico', description: 'Complete 50 push-ups in one set or in series.', difficulty: 2, id: 'punish-pushups', title: '50 push-ups' },
      { categoryName: 'hogar', description: 'Clean and organize an entire room in your home.', difficulty: 2, id: 'punish-clean-room', title: 'Clean a room' },
      { categoryName: 'finanzas', description: 'Donate 5 EUR to a cause you support.', difficulty: 2, id: 'punish-donate-5', title: 'Donate 5 EUR' },
      { categoryName: 'salud', description: 'Spend a full morning without coffee or energy drinks.', difficulty: 2, id: 'punish-no-coffee', title: 'No coffee in the morning' },
      { categoryName: 'nutricion', description: 'Cook a full healthy meal at home.', difficulty: 2, id: 'punish-cook', title: 'Cook a healthy meal' },
      { categoryName: 'estudio', description: 'Write 300 words about why you failed and what you will do differently.', difficulty: 2, id: 'punish-journal', title: 'Write a reflection' },
      { categoryName: 'fisico', description: 'Hold a plank for a total of 3 minutes.', difficulty: 2, id: 'punish-plank', title: '3-minute plank' },
      { categoryName: 'trabajo', description: 'Do 45 minutes of deep work without interruptions.', difficulty: 3, id: 'punish-deep-work', title: 'Deep work block' },
      { categoryName: 'fisico', description: 'Complete a continuous or combined 5-kilometer run.', difficulty: 3, id: 'punish-run', title: 'Run 5 km' },
      { categoryName: 'hogar', description: 'Do a deep clean of the kitchen or bathroom.', difficulty: 3, id: 'punish-kitchen', title: 'Deep clean the kitchen' },
      { categoryName: 'finanzas', description: 'Donate 15 EUR to a cause you support.', difficulty: 3, id: 'punish-donate-15', title: 'Donate 15 EUR' },
      { categoryName: 'entretenimiento', description: 'Spend 48 hours without series, movies, or entertainment videos.', difficulty: 3, id: 'punish-no-streaming', title: 'No streaming for 48 h' },
      { categoryName: 'salud', description: 'Complete 40 minutes of mobility, stretching, or yoga.', difficulty: 3, id: 'punish-mobility', title: '40-minute mobility session' },
      { categoryName: 'tarea', description: 'Resolve or archive all the small pending tasks you have built up.', difficulty: 3, id: 'punish-inbox-zero', title: 'Clear pending inbox' },
      { categoryName: 'hogar', description: 'Run a laundry cycle and fold and store every item.', difficulty: 2, id: 'punish-laundry', title: 'Wash and fold clothes' },
    ],
    form: {
      accessibility: {
        categoryInfo: 'View information about the {{label}} category',
        difficultyInfo: 'View information about the {{label}} difficulty',
      },
      buttons: {
        saveChanges: 'Save changes',
      },
      createTitle: 'Create punishment',
      editTitle: 'Edit punishment',
      fields: {
        description: 'Description',
        title: 'Punishment title',
      },
      loading: {
        description: 'I am retrieving the punishment so you can edit it without overwriting data.',
        title: 'Preparing form',
      },
      missing: {
        description: 'I could not find that custom punishment to edit.',
        title: 'Punishment unavailable',
      },
      placeholders: {
        description: 'Pick up and tidy the whole room',
        title: 'Tidy the room',
      },
      preview: {
        emptyDescription: 'No description. You can leave it like this or add more detail to make it clearer when completing it.',
        emptyTitle: 'Your punishment does not have a title yet',
        eyebrow: 'Preview',
      },
      sections: {
        category: 'Choose a category',
        difficulty: 'Select the difficulty',
        identity: 'Punishment identity',
      },
      submitError: 'Could not save the punishment.',
      titleError: 'Enter a title with at least 3 characters.',
      unsavedChanges: {
        createDescription: 'The information you entered for this punishment will be lost.',
        createTitle: 'Discard draft',
        editDescription: 'The changes you made to this punishment will be lost.',
        editTitle: 'Discard changes',
        keepEditing: 'Keep editing',
      },
    },
    history: {
      actions: {
        complete: 'Complete',
        new: 'New',
      },
      accessibility: {
        completedPunishmentInfo: 'View completed punishment information',
        createPunishmentHint: 'Open the screen to create a punishment',
        createPunishmentLabel: 'Add punishment',
        pendingGoalInfo: 'View goal information',
        punishmentActions: 'Show more actions for this punishment',
        punishmentActionsLabel: 'Open menu for {{title}}',
        toggleCompletedHide: 'Hide',
        toggleCompletedShow: 'Show',
        toggleCompletedLabel: 'Toggle completed punishments',
        toggleCompletedSection: '{{action}} the completed punishments section',
      },
      completeConfirmationTitle: 'Did you complete the punishment?',
      completedOn: 'Completed on {{dateLabel}}',
      deleteConfirmation: {
        confirm: 'Delete',
        description: 'The server will block deletion if this punishment was already assigned so the history is preserved.',
        eyebrow: 'Delete punishment',
        title: 'Delete punishment',
      },
      detailModal: {
        date: 'Date',
        description: 'Description',
        fallbackDescription: 'Completed punishment.',
        fallbackTitle: 'Punishment',
        noDescription: 'No description available.',
        relatedGoal: 'Related goal',
        relatedGoalFallback: 'No related goal',
        title: 'Title',
        titleLabel: 'Punishment detail',
      },
      empty: {
        filteredLibraryMessage: 'Try another combination or clear the active filters.',
        filteredLibraryTitle: 'No punishments match the filters',
        historyMessage: 'When you confirm a punishment as completed, it will be stored here with its date.',
        historyTitle: 'No completed punishments',
        libraryMessage: 'Create your first punishment to start building your library.',
        libraryTitle: 'There are no punishments yet',
        mineSuccessTitle: 'You have no pending punishments. Good job.',
      },
      filters: {
        category: 'Category',
        clearAll: 'Clear filters',
        difficulty: 'Difficulty',
        libraryTitle: 'Refine the library',
        origin: 'Origin',
        searchPlaceholder: 'Name or description',
        sectionTitle: 'Filters',
      },
      infoModal: {
        title: 'Information',
        unmetGoalLabel: 'You did not complete: ',
      },
      labels: {
        base: 'Base',
        completed: 'Completed',
        library: 'Library',
        mine: 'My punishments',
        pending: 'Pending',
        personal: 'Personal',
        screenTitle: 'Punishments',
        standard: 'Standard',
      },
      libraryStats: {
        mine: 'My punishments',
        standard: 'Standard',
      },
      pagination: {
        next: 'Next',
        page: 'Page {{current}} of {{total}}',
        previous: 'Previous',
      },
    },
    modal: {
      button: 'Got it',
      emptyDescription: 'Configure a punishment to reinforce the system.',
      emptyTitle: 'No punishment available',
      eyebrow: 'Generated consequence',
    },
    repository: {
      catalogLoadFailed: 'Could not load the punishment catalog.',
      createFailed: 'Could not save the custom punishment.',
      deleteFailed: 'Could not delete the custom punishment.',
      historyLoadFailed: 'Could not load completed punishment history.',
      loadFailed: 'Could not load the punishment.',
      pendingLoadFailed: 'Could not load pending punishments.',
      updateFailed: 'Could not update the custom punishment.',
    },
  },
} as const;

export const punishmentsCopy = createNamespaceProxy('punishments', punishmentResources.es);
export const punishmentCategoryCopy = createNamespaceProxy('punishments', punishmentResources.es.categoryCopy, 'categoryCopy');
export const punishmentDifficultyCopy = createNamespaceProxy('punishments', punishmentResources.es.difficultyCopy, 'difficultyCopy');

export function getPunishmentCategoryCopy() {
  return translateObject<Record<PunishmentCategoryName, { description: string; label: string }>>('punishments:categoryCopy');
}

export function getPunishmentDifficultyCopy() {
  return translateObject<Record<1 | 2 | 3, { description: string; label: string }>>('punishments:difficultyCopy');
}

export function getBasePunishmentCatalog() {
  return translateObject<typeof punishmentResources.es.baseCatalog>('punishments:baseCatalog');
}

export function getPunishmentCategoryInfoAccessibility(label: string) {
  return translate('punishments:form.accessibility.categoryInfo', { label });
}

export function getPunishmentDifficultyInfoAccessibility(label: string) {
  return translate('punishments:form.accessibility.difficultyInfo', { label });
}

export function getPunishmentActionsLabel(title: string) {
  return translate('punishments:history.accessibility.punishmentActionsLabel', { title });
}

export function getPunishmentCompletedOn(dateLabel: string) {
  return translate('punishments:history.completedOn', { dateLabel });
}

export function getPunishmentHistoryPageLabel(current: number, total: number) {
  return translate('punishments:history.pagination.page', { current, total });
}

export function getToggleCompletedSectionCopy(expanded: boolean) {
  return translate('punishments:history.accessibility.toggleCompletedSection', {
    action: expanded
      ? translate('punishments:history.accessibility.toggleCompletedHide')
      : translate('punishments:history.accessibility.toggleCompletedShow'),
  });
}
