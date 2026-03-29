import { GoalPunishmentScope } from '@/src/models/types';
import { formatDayUnit } from '@/src/i18n/common';
import { createNamespaceProxy, translate, translateObject } from '@/src/i18n/runtime';

export const goalResources = {
  es: {
    punishmentScopeOptions: [
      { description: 'Solo se podrán asignar castigos base de la app.', label: 'Base', value: 'base' },
      { description: 'Solo se podrán asignar castigos creados por el usuario.', label: 'Personales', value: 'personal' },
      { description: 'Podrán entrar castigos base y personales.', label: 'Ambos', value: 'both' },
    ],
    detail: {
      actions: {
        edit: 'Editar',
        finalize: 'Finalizar',
      },
      screenTitle: 'Objetivo',
      actionMenu: {
        deleteDescription: 'Se pedirá confirmación antes de eliminarlo.',
        editDescription: 'Modifica nombre, descripción y reglas.',
        eyebrow: 'Acciones',
        finalizeDescription: 'Cierra el ciclo y calcula el resultado al momento.',
      },
      announcement: {
        closeAccessibility: 'Cerrar resolución',
        consequence: 'Consecuencia',
        failedDescriptionWithPunishment: 'No has cumplido el objetivo y ahora debes completar:',
        failedDescriptionWithoutPunishment:
          'No has cumplido el objetivo. Esta vez no había castigos elegibles para asignar.',
        metricRate: 'Tasa',
        metricResult: 'Resultado',
        noEligiblePunishment:
          'El objetivo ha fallado, pero no se encontró un castigo elegible en el pool guardado.',
        successDescription: 'Has cumplido el mínimo exigido para cerrar este ciclo.',
        summaryFailed: 'Objetivo finalizado · fallado',
        summaryPassed: 'Objetivo finalizado · aprobado',
      },
      assignedPunishmentLoading: 'Cargando castigo asignado...',
      calendarTitle: 'Calendario',
      consequenceTitle: 'Consecuencia',
      failureWithoutEligiblePunishment:
        'El objetivo falló, pero no se pudo asignar un castigo porque el pool guardado ya no tenía opciones elegibles.',
      infoTitle: 'Información',
      loadingScheduleStatus: 'Cargando historial del objetivo...',
      labels: {
        bestStreak: 'Mejor racha',
        currentStreak: 'Racha actual',
        daysRemaining: 'Días restantes',
        daysUntilStart: 'Días para empezar',
        duration: 'Duración',
        end: 'Fin',
        possiblePunishments: 'Posibles castigos',
        requirement: 'Requisito',
        start: 'Inicio',
      },
      notFound: {
        message: 'Puede haber sido eliminado o puede que nunca se guardara.',
        subtitle: 'No he encontrado ese objetivo.',
        title: 'Objetivo no disponible',
      },
      progress: {
        approvedHint: 'Objetivo aprobado. El ciclo ya quedó resuelto.',
        almostThere: 'Quedan {{pendingRequiredDays}} {{dayUnit}} para aprobarlo.',
        completedDay_one: 'día cumplido',
        completedDay_other: 'días cumplidos',
        failedAssignedHint: 'Objetivo fallido. El castigo de este ciclo ya fue asignado.',
        failedWithoutPunishmentHint:
          'Objetivo fallido sin castigo asignado. El pool guardado ya no tenía opciones elegibles.',
        halfway: 'Ya has superado la mitad del objetivo.',
        helper: '{{progress}}% completado',
        justStarted: 'El ciclo acaba de arrancar. Ve sumando días cumplidos.',
        minimumReached: 'Ya tienes el mínimo necesario para aprobar si cierras hoy.',
        onTrack: 'Vas por buen camino.',
        unreachable:
          'Objetivo no alcanzable. Necesitas {{pendingRequiredDays}} {{completedUnit}} y solo quedan {{remainingDays}}.',
      },
    },
    form: {
      buttons: {
        createGoal: 'Crear objetivo',
        editGoal: 'Editar objetivo',
        saveChanges: 'Guardar cambios',
      },
      categoryMode: {
        all: 'Todas',
        selected: 'Seleccionar',
      },
      errors: {
        minimumDays: 'Debes elegir entre 1 y la duración total.',
        noEligiblePunishments: 'No hay castigos elegibles con esta configuración. Ajusta el origen o las categorías.',
        noSelectedCategories: 'Selecciona al menos una categoría o usa todas.',
        startDatePast: 'La fecha de inicio no puede estar en el pasado.',
        titleTooShort: 'Escribe un nombre de al menos 3 caracteres.',
        wrongDateOrder: 'La fecha de finalización no puede ser anterior al inicio.',
      },
      labels: {
        categories: 'Categorías',
        description: 'Descripción',
        endDate: 'Fecha de finalización',
        minimum: 'Mínimo',
        name: 'Nombre del objetivo',
        startDate: 'Fecha de inicio',
        type: 'Tipo',
      },
      locked: {
        backToGoals: 'Atrás a objetivos',
        description: 'Los objetivos cerrados ya no se pueden editar para mantener su resultado histórico.',
        title: 'Objetivo cerrado',
      },
      placeholders: {
        description: '30 minutos de fuerza o cardio',
        title: 'Hacer ejercicio',
      },
      progressCaptions: ['Objetivo', 'Duración', 'Cumplimiento', 'Castigos'],
      selectors: {
        goalEndsOn: 'El objetivo termina el',
        goalStartsOn: 'El objetivo empieza el',
        startDateLocked: 'No se puede modificar la fecha de inicio en objetivos ya empezados.',
      },
      sections: {
        dateRange: 'Duración',
        defineGoal: 'Define tu objetivo',
        punishmentTitle: 'Castigos',
        punishmentSelection: 'Selección de castigos',
        requiredDays: 'Días que debes cumplir',
        successRule: 'Cumplimiento',
      },
      helpers: {
        minimumDays: 'Elige el mínimo de días que tienes que cumplir para aprobar el objetivo.',
        punishmentSelection: 'Si fallas el objetivo, se te asignará un castigo aleatorio entre los que selecciones.',
      },
      summary: {
        allowedMisses: 'Podrás fallar hasta {{count}} días.',
        allowedMisses_one: 'Podrás fallar 1 día.',
        availablePunishments: '{{count}} castigos disponibles',
        availablePunishments_one: '1 castigo disponible',
        availablePunishmentsLoading: 'Cargando catálogo de castigos...',
        dateRange: 'Del {{startLabel}} al {{endLabel}}',
        minimumDays: 'Debes cumplir {{requiredDays}} de {{durationDays}} {{dayUnit}}',
        noMissesAllowed: 'No podrás fallar ningún día.',
        noAvailablePunishments: 'No hay castigos disponibles con esta selección.',
        title: 'Resumen',
        totalDuration: 'Duración total: {{durationDays}} {{dayUnit}}',
      },
    },
    home: {
      deadlineEndsToday: 'Termina hoy',
      deadlineInDays: 'Termina en {{remainingDays}} días',
      deadlineInDays_one: 'Termina en 1 día',
      emptyForDate: {
        action: 'Crear objetivo',
        message: 'Cambia la fecha para revisar otro momento o crea un nuevo objetivo para empezar a registrar actividad.',
        title: 'No había objetivos vigentes ese día',
      },
      emptyState: {
        action: 'Crear objetivo',
        message: 'Cuando tengas objetivos creados, aquí verás tus tareas del día para resolverlas rápido.',
        title: 'Todavía no hay objetivos',
      },
      loading: {
        message: 'Cargando el estado del día seleccionado...',
        title: 'Actualizando objetivos',
      },
      progressDays: '{{completedDays}}/{{requiredDays}} días cumplidos',
      scheduleStatus: {
        deadlineFinished: 'El plazo configurado ya ha terminado.',
        failedPendingPunishment: 'Objetivo finalizado y fallado. Tiene un castigo pendiente.',
        failedWithoutPunishment: 'Objetivo finalizado y fallado. No había castigos elegibles.',
        passed: 'Objetivo finalizado y aprobado.',
        pendingResolution: 'Objetivo finalizado y pendiente de resolución.',
        remainingMany: 'Quedan {{remainingDays}} días para cerrar el plazo.',
        remainingOne: 'Queda 1 día para cerrar el plazo.',
        startsInDays: 'Empieza en {{daysUntilStart}} días.',
        startsTomorrow: 'Empieza mañana.',
      },
      tutorialDemoDescription: 'Objetivo de ejemplo del tutorial.',
      tutorialDemoTitle: 'Salir a correr 30 minutos',
      todayStatus: {
        completed: 'Hoy: hecho',
        failed: 'Hoy: fallado',
        finished: 'Objetivo finalizado',
        pending: 'Hoy: pendiente',
      },
    },
    historyCard: {
      finishedFailed: 'Objetivo finalizado sin cumplir el minimo',
      finishedPassed: 'Objetivo finalizado con exito',
      today: 'Hoy',
      yesterday: 'Hace 1 d',
      daysAgo: 'Hace {{daysSinceEnd}} d',
    },
    list: {
      confirmation: {
        delete: {
          confirm: 'Borrar',
          description:
            'Se borrarán también sus check-ins, outcomes y castigos asignados. Esta acción no se puede deshacer.',
          eyebrow: 'Eliminar objetivo',
          title: 'Borrar objetivo',
        },
        finalize: {
          confirm: 'Finalizar',
          description:
            'Se resolverá el objetivo antes de llegar a su fecha de finalización. Esta acción no podrá deshacerse.',
          eyebrow: '',
          title: 'Finalizar objetivo',
        },
      },
      empty: {
        active: 'No tienes objetivos activos ahora mismo.',
        closed: 'Todavía no hay objetivos finalizados.',
        noGoalsMessage: 'Crea tu primer objetivo para empezar a registrar avances, cerrar ciclos y mantener el foco.',
        noGoalsTitle: 'Todavía no hay objetivos',
      },
      pagination: {
        next: 'Siguiente',
        previous: 'Anterior',
      },
      cards: {
        closedApproved: 'Cerrado y aprobado',
        closedFailed: 'Cerrado y fallado',
        lastCycleDays: 'Últimos días del ciclo',
        lastFiveDays: 'Últimos 5 días',
        openActionsHint: 'Muestra más acciones para este objetivo',
        openActionsLabel: 'Abrir menú de {{title}}',
        viewDetailHint: 'Abre el detalle del objetivo',
        viewDetailLabel: 'Ver detalle de {{title}}',
      },
      screenTitle: 'Objetivos',
      sections: {
        active: 'Activos',
        closed: 'Finalizados',
        toggleHint: '{{action}} la sección {{title}}',
      },
    },
  },
  en: {
    punishmentScopeOptions: [
      { description: 'Only base punishments from the app can be assigned.', label: 'Base', value: 'base' },
      { description: 'Only punishments created by the user can be assigned.', label: 'Personal', value: 'personal' },
      { description: 'Both base and personal punishments can be assigned.', label: 'Both', value: 'both' },
    ],
    detail: {
      actions: {
        edit: 'Edit',
        finalize: 'Finish',
      },
      screenTitle: 'Goal',
      actionMenu: {
        deleteDescription: 'You will be asked to confirm before deleting it.',
        editDescription: 'Update its name, description, and rules.',
        eyebrow: 'Actions',
        finalizeDescription: 'Close the cycle and calculate the result right away.',
      },
      announcement: {
        closeAccessibility: 'Close resolution',
        consequence: 'Consequence',
        failedDescriptionWithPunishment: 'You did not complete the goal and now you must finish:',
        failedDescriptionWithoutPunishment:
          'You did not complete the goal. This time there were no eligible punishments to assign.',
        metricRate: 'Rate',
        metricResult: 'Result',
        noEligiblePunishment: 'The goal failed, but no eligible punishment was found in the saved pool.',
        successDescription: 'You met the minimum required to close this cycle.',
        summaryFailed: 'Goal finished · failed',
        summaryPassed: 'Goal finished · approved',
      },
      assignedPunishmentLoading: 'Loading assigned punishment...',
      calendarTitle: 'Calendar',
      consequenceTitle: 'Consequence',
      failureWithoutEligiblePunishment:
        'The goal failed, but a punishment could not be assigned because the saved pool no longer had eligible options.',
      infoTitle: 'Information',
      loadingScheduleStatus: 'Loading goal history...',
      labels: {
        bestStreak: 'Best streak',
        currentStreak: 'Current streak',
        daysRemaining: 'Days left',
        daysUntilStart: 'Days until start',
        duration: 'Duration',
        end: 'End',
        possiblePunishments: 'Possible punishments',
        requirement: 'Requirement',
        start: 'Start',
      },
      notFound: {
        message: 'It may have been deleted or never saved.',
        subtitle: 'I could not find that goal.',
        title: 'Goal unavailable',
      },
      progress: {
        approvedHint: 'Goal approved. The cycle has already been resolved.',
        almostThere: '{{pendingRequiredDays}} {{dayUnit}} left to approve it.',
        completedDay_one: 'completed day',
        completedDay_other: 'completed days',
        failedAssignedHint: 'Goal failed. The punishment for this cycle has already been assigned.',
        failedWithoutPunishmentHint:
          'Goal failed without an assigned punishment. The saved pool no longer had eligible options.',
        halfway: 'You have already gone past the halfway point.',
        helper: '{{progress}}% completed',
        justStarted: 'The cycle just started. Keep adding completed days.',
        minimumReached: 'You already have the minimum needed to approve if you close today.',
        onTrack: 'You are on track.',
        unreachable:
          'Goal is no longer reachable. You need {{pendingRequiredDays}} {{completedUnit}} and only {{remainingDays}} are left.',
      },
    },
    form: {
      buttons: {
        createGoal: 'Create goal',
        editGoal: 'Edit goal',
        saveChanges: 'Save changes',
      },
      categoryMode: {
        all: 'All',
        selected: 'Select',
      },
      errors: {
        minimumDays: 'Choose between 1 and the full duration.',
        noEligiblePunishments: 'There are no eligible punishments with this setup. Adjust the source or categories.',
        noSelectedCategories: 'Select at least one category or use all of them.',
        startDatePast: 'The start date cannot be in the past.',
        titleTooShort: 'Enter a name with at least 3 characters.',
        wrongDateOrder: 'The end date cannot be earlier than the start date.',
      },
      labels: {
        categories: 'Categories',
        description: 'Description',
        endDate: 'End date',
        minimum: 'Minimum',
        name: 'Goal name',
        startDate: 'Start date',
        type: 'Type',
      },
      locked: {
        backToGoals: 'Back to goals',
        description: 'Closed goals can no longer be edited so their historical result stays intact.',
        title: 'Closed goal',
      },
      placeholders: {
        description: '30 minutes of strength or cardio',
        title: 'Exercise',
      },
      progressCaptions: ['Goal', 'Duration', 'Success rule', 'Punishments'],
      selectors: {
        goalEndsOn: 'The goal ends on',
        goalStartsOn: 'The goal starts on',
        startDateLocked: 'The start date cannot be changed for goals that already started.',
      },
      sections: {
        dateRange: 'Duration',
        defineGoal: 'Define your goal',
        punishmentTitle: 'Punishments',
        punishmentSelection: 'Punishment selection',
        requiredDays: 'Days you must complete',
        successRule: 'Success rule',
      },
      helpers: {
        minimumDays: 'Choose the minimum number of days you must complete to approve the goal.',
        punishmentSelection: 'If you fail the goal, a random punishment will be assigned from the ones you select.',
      },
      summary: {
        allowedMisses: 'You can miss up to {{count}} days.',
        allowedMisses_one: 'You can miss 1 day.',
        availablePunishments: '{{count}} punishments available',
        availablePunishments_one: '1 punishment available',
        availablePunishmentsLoading: 'Loading punishment catalog...',
        dateRange: 'From {{startLabel}} to {{endLabel}}',
        minimumDays: 'You must complete {{requiredDays}} of {{durationDays}} {{dayUnit}}',
        noMissesAllowed: 'You will not be allowed to miss any day.',
        noAvailablePunishments: 'There are no punishments available with this selection.',
        title: 'Summary',
        totalDuration: 'Total duration: {{durationDays}} {{dayUnit}}',
      },
    },
    home: {
      deadlineEndsToday: 'Ends today',
      deadlineInDays: 'Ends in {{remainingDays}} days',
      deadlineInDays_one: 'Ends in 1 day',
      emptyForDate: {
        action: 'Create goal',
        message: 'Change the date to review another moment or create a new goal to start tracking activity.',
        title: 'There were no active goals that day',
      },
      emptyState: {
        action: 'Create goal',
        message: 'Once you create goals, you will see your tasks for the day here and resolve them quickly.',
        title: 'There are no goals yet',
      },
      loading: {
        message: 'Loading the state for the selected day...',
        title: 'Updating goals',
      },
      progressDays: '{{completedDays}}/{{requiredDays}} completed days',
      scheduleStatus: {
        deadlineFinished: 'The configured time window has already ended.',
        failedPendingPunishment: 'Goal finished and failed. It has a pending punishment.',
        failedWithoutPunishment: 'Goal finished and failed. There were no eligible punishments.',
        passed: 'Goal finished and approved.',
        pendingResolution: 'Goal finished and pending resolution.',
        remainingMany: '{{remainingDays}} days left before the time window closes.',
        remainingOne: '1 day left before the time window closes.',
        startsInDays: 'Starts in {{daysUntilStart}} days.',
        startsTomorrow: 'Starts tomorrow.',
      },
      tutorialDemoDescription: 'Tutorial demo goal.',
      tutorialDemoTitle: 'Go for a 30-minute run',
      todayStatus: {
        completed: 'Today: done',
        failed: 'Today: failed',
        finished: 'Goal finished',
        pending: 'Today: pending',
      },
    },
    historyCard: {
      finishedFailed: 'Goal finished without meeting the minimum',
      finishedPassed: 'Goal finished successfully',
      today: 'Today',
      yesterday: '1 day ago',
      daysAgo: '{{daysSinceEnd}} days ago',
    },
    list: {
      confirmation: {
        delete: {
          confirm: 'Delete',
          description:
            'Its check-ins, outcomes, and assigned punishments will also be deleted. This action cannot be undone.',
          eyebrow: 'Delete goal',
          title: 'Delete goal',
        },
        finalize: {
          confirm: 'Finish',
          description: 'The goal will be resolved before its end date. This action cannot be undone.',
          eyebrow: '',
          title: 'Finish goal',
        },
      },
      empty: {
        active: 'You do not have any active goals right now.',
        closed: 'There are no finished goals yet.',
        noGoalsMessage: 'Create your first goal to start tracking progress, closing cycles, and staying focused.',
        noGoalsTitle: 'There are no goals yet',
      },
      pagination: {
        next: 'Next',
        previous: 'Previous',
      },
      cards: {
        closedApproved: 'Closed and approved',
        closedFailed: 'Closed and failed',
        lastCycleDays: 'Last cycle days',
        lastFiveDays: 'Last 5 days',
        openActionsHint: 'Show more actions for this goal',
        openActionsLabel: 'Open menu for {{title}}',
        viewDetailHint: 'Open the goal detail',
        viewDetailLabel: 'View detail for {{title}}',
      },
      screenTitle: 'Goals',
      sections: {
        active: 'Active',
        closed: 'Finished',
        toggleHint: '{{action}} the {{title}} section',
      },
    },
  },
} as const;

export const goalsCopy = createNamespaceProxy('goals', goalResources.es);

export function getGoalPunishmentScopeOptions() {
  return translateObject<readonly { description: string; label: string; value: GoalPunishmentScope }[]>(
    'goals:punishmentScopeOptions',
  );
}

export function getGoalPunishmentScopeLabel(scope: GoalPunishmentScope) {
  return getGoalPunishmentScopeOptions().find((option) => option.value === scope)?.label ?? getGoalPunishmentScopeOptions()[0].label;
}

export function getGoalProgressAlmostThere(pendingRequiredDays: number) {
  return translate('goals:detail.progress.almostThere', {
    pendingRequiredDays,
    dayUnit: formatDayUnit(pendingRequiredDays),
  });
}

export function getGoalProgressHelper(progress: number) {
  return translate('goals:detail.progress.helper', { progress });
}

export function getGoalProgressUnreachable(pendingRequiredDays: number, remainingDays: number) {
  return translate('goals:detail.progress.unreachable', {
    pendingRequiredDays,
    remainingDays,
    completedUnit: translate('goals:detail.progress.completedDay', { count: pendingRequiredDays }),
  });
}

export function getAllowedMissesCopy(count: number) {
  return translate('goals:form.summary.allowedMisses', { count });
}

export function getAvailablePunishmentsCopy(count: number) {
  return translate('goals:form.summary.availablePunishments', { count });
}

export function getGoalDateRangeCopy(startLabel: string, endLabel: string) {
  return translate('goals:form.summary.dateRange', { startLabel, endLabel });
}

export function getGoalMinimumDaysCopy(requiredDays: number, durationDays: number) {
  return translate('goals:form.summary.minimumDays', {
    requiredDays,
    durationDays,
    dayUnit: formatDayUnit(durationDays),
  });
}

export function getGoalTotalDurationCopy(durationDays: number) {
  return translate('goals:form.summary.totalDuration', {
    durationDays,
    dayUnit: formatDayUnit(durationDays),
  });
}

export function getGoalDeadlineCopy(remainingDays: number) {
  return translate('goals:home.deadlineInDays', { remainingDays });
}

export function getGoalProgressDaysCopy(completedDays: number, requiredDays: number) {
  return translate('goals:home.progressDays', { completedDays, requiredDays });
}

export function getGoalRemainingDaysCopy(remainingDays: number) {
  return remainingDays === 1
    ? translate('goals:home.scheduleStatus.remainingOne')
    : translate('goals:home.scheduleStatus.remainingMany', { remainingDays });
}

export function getGoalStartsInDaysCopy(daysUntilStart: number) {
  return translate('goals:home.scheduleStatus.startsInDays', { daysUntilStart });
}

export function getGoalStartsWhenCopy(daysUntilStart: number) {
  return daysUntilStart === 1 ? translate('goals:home.scheduleStatus.startsTomorrow') : getGoalStartsInDaysCopy(daysUntilStart);
}

export function getGoalClosesInCopy(remainingDays: number) {
  if (remainingDays <= 0) {
    return translate('goals:home.scheduleStatus.deadlineFinished');
  }

  return remainingDays === 1
    ? translate('goals:home.scheduleStatus.remainingOne')
    : translate('goals:home.scheduleStatus.remainingMany', { remainingDays });
}

export function getGoalTodayStatusCopy(input: {
  lifecycleStatus: 'active' | 'closed';
  resolutionStatus: 'pending' | 'passed' | 'failed';
  todayStatus?: 'completed' | 'missed';
}) {
  if (input.lifecycleStatus !== 'closed') {
    if (input.todayStatus === 'completed') {
      return translate('goals:home.todayStatus.completed');
    }

    if (input.todayStatus === 'missed') {
      return translate('goals:home.todayStatus.failed');
    }

    return translate('goals:home.todayStatus.pending');
  }

  if (input.resolutionStatus === 'passed') {
    return translate('goals:list.cards.closedApproved');
  }

  if (input.resolutionStatus === 'failed') {
    return translate('goals:list.cards.closedFailed');
  }

  return translate('goals:home.todayStatus.finished');
}

export function getGoalHistoryOutcomeCopy(passed: boolean) {
  return passed ? translate('goals:historyCard.finishedPassed') : translate('goals:historyCard.finishedFailed');
}

export function getGoalHistoryRelativeDateCopy(daysSinceEnd: number) {
  if (daysSinceEnd <= 0) {
    return translate('goals:historyCard.today');
  }

  if (daysSinceEnd === 1) {
    return translate('goals:historyCard.yesterday');
  }

  return translate('goals:historyCard.daysAgo', { daysSinceEnd });
}

export function getGoalOpenActionsLabel(title: string) {
  return translate('goals:list.cards.openActionsLabel', { title });
}

export function getGoalViewDetailLabel(title: string) {
  return translate('goals:list.cards.viewDetailLabel', { title });
}

export function getGoalSectionToggleHint(action: string, title: string) {
  return translate('goals:list.sections.toggleHint', { action, title: title.toLowerCase() });
}
