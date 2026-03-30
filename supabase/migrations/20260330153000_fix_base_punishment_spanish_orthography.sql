with canonical(legacy_title, canonical_title, canonical_description, difficulty) as (
  values
    ('Sin redes sociales', 'Sin redes sociales', 'Pasa 30 minutos sin abrir redes sociales.', 1::smallint),
    ('Camina 8000 pasos', 'Camina 8000 pasos', 'Completa una caminata de al menos 8000 pasos hoy.', 1::smallint),
    ('Ordena el escritorio', 'Ordena el escritorio', 'Deja tu zona de trabajo limpia y ordenada.', 1::smallint),
    ('Leer 20 paginas', 'Leer 20 páginas', 'Lee 20 páginas de un libro útil o formativo.', 1::smallint),
    ('Dormir sin pantallas', 'Dormir sin pantallas', 'Pasa la última hora del día sin móvil ni ordenador.', 1::smallint),
    ('50 flexiones', '50 flexiones', 'Completa 50 flexiones en una sola tanda o en series.', 2::smallint),
    ('Limpia una habitacion', 'Limpia una habitación', 'Ordena y limpia por completo una habitación de tu casa.', 2::smallint),
    ('Donar 5 EUR', 'Donar 5 EUR', 'Haz una donación de 5 EUR a una causa que apoyes.', 2::smallint),
    ('Sin cafe manana', 'Sin café mañana', 'Mantén una mañana completa sin café ni bebidas energizantes.', 2::smallint),
    ('Preparar comida sana', 'Preparar comida sana', 'Cocina una comida completa y saludable en casa.', 2::smallint),
    ('Escribir reflexion', 'Escribir reflexión', 'Escribe 300 palabras sobre por qué fallaste y qué harás distinto.', 2::smallint),
    ('Plancha 3 minutos', 'Plancha 3 minutos', 'Haz una plancha acumulada de 3 minutos.', 2::smallint),
    ('Bloque profundo', 'Bloque profundo', 'Haz 45 minutos de trabajo profundo sin interrupciones.', 3::smallint),
    ('Correr 5 km', 'Correr 5 km', 'Completa una carrera continua o combinada de 5 kilómetros.', 3::smallint),
    ('Limpieza profunda cocina', 'Limpieza profunda cocina', 'Haz una limpieza a fondo de la cocina o el baño.', 3::smallint),
    ('Donar 15 EUR', 'Donar 15 EUR', 'Haz una donación de 15 EUR a una causa que apoyes.', 3::smallint),
    ('Sin streaming 48h', 'Sin streaming 48h', 'Pasa 48 horas sin series, películas ni vídeos de ocio.', 3::smallint),
    ('Sesion de movilidad 40 min', 'Sesión de movilidad 40 min', 'Completa 40 minutos de movilidad, estiramientos o yoga.', 3::smallint),
    ('Vaciar bandeja pendiente', 'Vaciar bandeja pendiente', 'Resuelve o archiva todos los pendientes pequeños acumulados.', 3::smallint),
    ('Lavar y doblar ropa', 'Lavar y doblar ropa', 'Pon una lavadora y deja toda la ropa doblada y guardada.', 2::smallint)
)
update public.punishments as punishment_row
set
  title = canonical.canonical_title,
  description = canonical.canonical_description
from canonical
where punishment_row.owner_id is null
  and punishment_row.is_custom = false
  and punishment_row.difficulty = canonical.difficulty
  and punishment_row.title in (canonical.legacy_title, canonical.canonical_title);
