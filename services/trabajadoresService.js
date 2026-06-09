import { Empleado, Huella, Direccion, Cargo, Horario } from '../models/index.js';
import { registrarAuditoria } from './auditoriaService.js';
import { Op } from 'sequelize';

async function getHuellas() {
  const huellas = await Huella.findAll({
    include: [{
      model: Empleado,
      where: { activo: true }
    }]
  });

  return huellas.map(h => ({
    trabajador_id: h.cedula,
    huella_template: h.template_huella.toString('base64')
  }));
}

async function registrarTrabajador(data, req) {
  const {
    primer_nombre,
    segundo_nombre,
    primer_apellido,
    segundo_apellido,
    cedula,
    id_departamento,
    id_cargo,
    id_horario,
    huella_template
  } = data;

  if (!primer_nombre || !primer_apellido || !cedula || !id_departamento || !id_cargo || !id_horario || !huella_template) {
    const error = new Error('Faltan campos obligatorios para el registro');
    error.statusCode = 400;
    throw error;
  }

  // Validación de seguridad por dirección: Los administradores sólo pueden registrar personal de su propia dirección
  if (req && req.user && req.user.rol === 'Administrador') {
    if (parseInt(id_departamento, 10) !== req.user.id_direccion) {
      const error = new Error('No tiene privilegios para registrar trabajadores en otra dirección.');
      error.statusCode = 403;
      throw error;
    }
  }

  const numericCedula = parseInt(cedula.toString().replace(/\D/g, ''), 10);
  if (isNaN(numericCedula)) {
    const error = new Error('Cédula inválida. Debe contener caracteres numéricos');
    error.statusCode = 400;
    throw error;
  }

  const existeEmpleado = await Empleado.findByPk(numericCedula);
  if (existeEmpleado) {
    const error = new Error(`El empleado con cédula ${numericCedula} ya se encuentra registrado`);
    error.statusCode = 409;
    throw error;
  }

  // Regla de negocio: Sólo un administrador (id_cargo = 3) por dirección
  if (parseInt(id_cargo, 10) === 3) {
    const existingAdmin = await Empleado.findOne({
      where: {
        id_direccion: parseInt(id_departamento, 10),
        id_cargo: 3,
        activo: true
      }
    });
    if (existingAdmin) {
      const error = new Error('La dirección seleccionada ya cuenta con un empleado con el cargo de Administrador. Solo se permite un Administrador por dirección.');
      error.statusCode = 400;
      throw error;
    }
  }

  const bufferHuella = Buffer.from(huella_template, 'base64');

  const nuevoEmpleado = await Empleado.create({
    cedula: numericCedula,
    primer_nombre,
    segundo_nombre: segundo_nombre || null,
    primer_apellido,
    segundo_apellido: segundo_apellido || null,
    id_direccion: parseInt(id_departamento, 10),
    id_cargo: parseInt(id_cargo, 10),
    id_horario: parseInt(id_horario, 10),
    activo: true
  });

  await Huella.create({
    cedula: numericCedula,
    template_huella: bufferHuella
  });

  // Registrar en tabla de Auditoría
  await registrarAuditoria('Empleados', nuevoEmpleado.cedula, 'INSERT', null, nuevoEmpleado.toJSON(), req);

  return { trabajador_id: nuevoEmpleado.cedula };
}

async function getDepartamentos() {
  let direcciones = await Direccion.findAll();
  if (direcciones.length === 0) {
    await Direccion.bulkCreate([
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
    ]);
    direcciones = await Direccion.findAll();
  }
  return direcciones.map(d => ({
    id_departamento: d.id_direccion,
    nombre_departamento: d.nombre_direccion
  }));
}

async function getCargos() {
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

  return await Cargo.findAll();
}

async function getHorarios() {
  let horarios = await Horario.findAll();
  if (horarios.length === 0) {
    await Horario.bulkCreate([
      { descripcion: 'Mañana Administración', hora_entrada_esperada: '08:00:00', hora_salida_esperada: '12:00:00', tolerancia_minutos: 15 },
      { descripcion: 'Tarde Administración', hora_entrada_esperada: '13:00:00', hora_salida_esperada: '17:00:00', tolerancia_minutos: 15 },
      { descripcion: 'Docente Turno Completo', hora_entrada_esperada: '07:30:00', hora_salida_esperada: '18:00:00', tolerancia_minutos: 30 }
    ]);
    horarios = await Horario.findAll();
  }
  return horarios;
}

async function getTrabajadores(req) {
  const queryOptions = {
    where: { activo: true },
    include: [Direccion, Cargo, Horario]
  };

  // Filtrar por la dirección asignada del administrador o supervisor
  if (req && req.user && !req.user.isDeveloper) {
    const idDireccion = req.user.id_direccion;
    if (idDireccion) {
      queryOptions.where.id_direccion = idDireccion;
    }
  }

  return await Empleado.findAll(queryOptions);
}

async function actualizarTrabajador(cedula, data, req) {
  const empleado = await Empleado.findByPk(cedula);
  if (!empleado) {
    const error = new Error(`El empleado con cédula ${cedula} no existe`);
    error.statusCode = 404;
    throw error;
  }

  // Validar permisos del rol
  if (req && req.user) {
    if (req.user.rol === 'Administrador') {
      // Un Administrador solo puede actualizar personal de su propia dirección
      if (empleado.id_direccion !== req.user.id_direccion) {
        const error = new Error('No tiene privilegios para actualizar trabajadores de otra dirección.');
        error.statusCode = 403;
        throw error;
      }
      // El Administrador no puede cambiar la dirección del empleado
      if (data.id_direccion && parseInt(data.id_direccion, 10) !== empleado.id_direccion) {
        const error = new Error('No tiene privilegios para cambiar la dirección a la cual pertenece un usuario.');
        error.statusCode = 403;
        throw error;
      }
    }
  }

  // Regla de negocio: Sólo un administrador (id_cargo = 3) por dirección
  if (data.id_cargo !== undefined && parseInt(data.id_cargo, 10) === 3) {
    const targetDir = data.id_direccion !== undefined ? parseInt(data.id_direccion, 10) : empleado.id_direccion;
    const existingAdmin = await Empleado.findOne({
      where: {
        id_direccion: targetDir,
        id_cargo: 3,
        activo: true,
        cedula: {
          [Op.ne]: empleado.cedula
        }
      }
    });
    if (existingAdmin) {
      const error = new Error('La dirección seleccionada ya cuenta con un empleado con el cargo de Administrador. Solo se permite un Administrador por dirección.');
      error.statusCode = 400;
      throw error;
    }
  }

  const valoresAnteriores = empleado.toJSON();

  // Actualizar campos
  empleado.primer_nombre = data.primer_nombre !== undefined ? data.primer_nombre : empleado.primer_nombre;
  empleado.segundo_nombre = data.segundo_nombre !== undefined ? data.segundo_nombre : empleado.segundo_nombre;
  empleado.primer_apellido = data.primer_apellido !== undefined ? data.primer_apellido : empleado.primer_apellido;
  empleado.segundo_apellido = data.segundo_apellido !== undefined ? data.segundo_apellido : empleado.segundo_apellido;
  empleado.id_cargo = data.id_cargo !== undefined ? parseInt(data.id_cargo, 10) : empleado.id_cargo;
  empleado.id_horario = data.id_horario !== undefined ? parseInt(data.id_horario, 10) : empleado.id_horario;
  empleado.activo = data.activo !== undefined ? data.activo : empleado.activo;

  // Solo el Developer puede cambiar la dirección del empleado
  if (req && req.user && req.user.isDeveloper) {
    empleado.id_direccion = data.id_direccion !== undefined ? parseInt(data.id_direccion, 10) : empleado.id_direccion;
  }

  await empleado.save();

  // Registrar auditoría de actualización
  await registrarAuditoria('Empleados', empleado.cedula, 'UPDATE', valoresAnteriores, empleado.toJSON(), req);

  return empleado;
}

export {
  getHuellas,
  registrarTrabajador,
  getDepartamentos,
  getCargos,
  getHorarios,
  getTrabajadores,
  actualizarTrabajador
};
