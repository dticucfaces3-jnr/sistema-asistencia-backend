import { Direccion, Cargo, Horario, Empleado } from '../models/index.js';

/**
 * Servicio de Semillero (Seeding)
 * 
 * Principios aplicados:
 * - SRP: Este archivo tiene la única responsabilidad de inicializar la base de datos con datos de catálogo obligatorios.
 * - KISS: Código estructurado y directo para asegurar la consistencia referencial inicial de la aplicación.
 */
export async function seedDatabase() {
  try {
    console.log('🌱 Verificando y sembrando datos maestros de la base de datos...');

    // 1. Sembrar Direcciones (Facultad de Ciencias Económicas y Sociales - FaCES)
    console.log('  -> Asegurando tabla Direcciones...');
    const direccionesRequeridas = [
      { id_direccion: 1, nombre_direccion: 'Dirección de Administración Sectorial' },
      { id_direccion: 2, nombre_direccion: 'Dirección de Asuntos Estudiantiles' },
      { id_direccion: 3, nombre_direccion: 'Dirección de Recursos Humanos' },
      { id_direccion: 4, nombre_direccion: 'Dirección de Tecnologías de Información y Comunicación' },
      { id_direccion: 5, nombre_direccion: 'Dirección de Estudios de Pregrado' },
      { id_direccion: 6, nombre_direccion: 'Dirección de Estudios de Postgrado' },
      { id_direccion: 7, nombre_direccion: 'Dirección de la Escuela de Administración Comercial y Contaduría Pública' },
      { id_direccion: 8, nombre_direccion: 'Dirección de la Escuela de Economía' },
      { id_direccion: 9, nombre_direccion: 'Dirección de la Escuela de Relaciones Industriales' },
      { id_direccion: 10, nombre_direccion: 'Dirección de Investigación' },
      { id_direccion: 11, nombre_direccion: 'Dirección de Extensión y Relaciones Interinstitucionales' },
      { id_direccion: 12, nombre_direccion: 'Dirección de Docencia y Diseño Curricular' }
    ];
    for (const item of direccionesRequeridas) {
      const [dir, created] = await Direccion.findOrCreate({
        where: { id_direccion: item.id_direccion },
        defaults: { nombre_direccion: item.nombre_direccion }
      });
      if (!created && dir.nombre_direccion !== item.nombre_direccion) {
        dir.nombre_direccion = item.nombre_direccion;
        await dir.save();
      }
    }
    let direcciones = await Direccion.findAll();

    // 2. Sembrar Cargos
    console.log('  -> Asegurando tabla Cargos...');
    const cargosRequeridos = [
      { id_cargo: 1, nombre_cargo: 'Obreros' },
      { id_cargo: 2, nombre_cargo: 'empleados' },
      { id_cargo: 3, nombre_cargo: 'administrador' }
    ];
    for (const item of cargosRequeridos) {
      const [cargo, created] = await Cargo.findOrCreate({
        where: { id_cargo: item.id_cargo },
        defaults: { nombre_cargo: item.nombre_cargo }
      });
      if (!created && cargo.nombre_cargo !== item.nombre_cargo) {
        cargo.nombre_cargo = item.nombre_cargo;
        await cargo.save();
      }
    }
    let cargos = await Cargo.findAll();

    // 3. Sembrar Horarios
    console.log('  -> Asegurando tabla Horarios...');
    const horariosRequeridos = [
      { id_horario: 1, descripcion: 'Mañana Administración', hora_entrada_esperada: '08:00:00', hora_salida_esperada: '12:00:00', tolerancia_minutos: 15 },
      { id_horario: 2, descripcion: 'Tarde Administración', hora_entrada_esperada: '13:00:00', hora_salida_esperada: '17:00:00', tolerancia_minutos: 15 },
      { id_horario: 3, descripcion: 'Docente Turno Completo', hora_entrada_esperada: '07:30:00', hora_salida_esperada: '18:00:00', tolerancia_minutos: 30 }
    ];
    for (const item of horariosRequeridos) {
      const [hor, created] = await Horario.findOrCreate({
        where: { id_horario: item.id_horario },
        defaults: {
          descripcion: item.descripcion,
          hora_entrada_esperada: item.hora_entrada_esperada,
          hora_salida_esperada: item.hora_salida_esperada,
          tolerancia_minutos: item.tolerancia_minutos
        }
      });
      if (!created && (hor.descripcion !== item.descripcion || hor.hora_entrada_esperada !== item.hora_entrada_esperada)) {
        hor.descripcion = item.descripcion;
        hor.hora_entrada_esperada = item.hora_entrada_esperada;
        hor.hora_salida_esperada = item.hora_salida_esperada;
        hor.tolerancia_minutos = item.tolerancia_minutos;
        await hor.save();
      }
    }
    let horarios = await Horario.findAll();

    console.log('✅ Semillero inicial de base de datos completado exitosamente.');

  } catch (error) {
    console.error('⚠️ Error al sembrar los datos iniciales de la base de datos:', error);
  }
}
