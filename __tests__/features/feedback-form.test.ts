import {
  canSubmitFeedback,
  createInitialFeedbackValues,
  normalizeFeedbackValues,
  validateFeedbackForm,
} from '@/src/features/feedback/form';

describe('feedback form helpers', () => {
  test('creates an empty initial state', () => {
    expect(createInitialFeedbackValues()).toEqual({
      subject: '',
      message: '',
      category: '',
      affectedSection: '',
      contactEmail: '',
      reproductionSteps: '',
    });
  });

  test('normalizes text fields and trims the contact email', () => {
    expect(
      normalizeFeedbackValues({
        subject: '  Mejorar onboarding  ',
        message: '  Anadir explicacion extra  ',
        category: 'Nueva funci\u00f3n',
        affectedSection: '  Ajustes  ',
        contactEmail: '  persona@example.com  ',
        reproductionSteps: '  1. Abrir app  ',
      }),
    ).toEqual({
      subject: 'Mejorar onboarding',
      message: 'Anadir explicacion extra',
      category: 'Nueva funci\u00f3n',
      affectedSection: 'Ajustes',
      contactEmail: 'persona@example.com',
      reproductionSteps: '1. Abrir app',
    });
  });

  test('requires subject and message for suggestions', () => {
    expect(validateFeedbackForm('suggestion', createInitialFeedbackValues())).toEqual({
      subject: 'Introduce un asunto',
      message: 'Describe tu sugerencia',
    });
  });

  test('validates contact email format when it is present', () => {
    expect(
      validateFeedbackForm('bug_report', {
        ...createInitialFeedbackValues(),
        subject: 'La app se cierra',
        message: 'Ocurre al abrir objetivos',
        contactEmail: 'correo-invalido',
      }),
    ).toEqual({
      contactEmail: 'Introduce un email v\u00e1lido',
    });
  });

  test('allows submission when the required fields are valid', () => {
    expect(
      canSubmitFeedback('suggestion', {
        ...createInitialFeedbackValues(),
        subject: 'Mas estadisticas',
        message: 'Me gustaria ver metricas semanales.',
        contactEmail: 'persona@example.com',
      }),
    ).toBe(true);
  });

  test('uses the bug report specific validation copy', () => {
    expect(validateFeedbackForm('bug_report', createInitialFeedbackValues())).toEqual({
      subject: 'Introduce un titulo',
      message: 'Describe el problema',
    });
  });

  test('allows bug report submission without optional fields', () => {
    expect(
      canSubmitFeedback('bug_report', {
        ...createInitialFeedbackValues(),
        subject: 'Fallo al abrir ajustes',
        message: 'La pantalla se queda en blanco.',
      }),
    ).toBe(true);
  });
});
