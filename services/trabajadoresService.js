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
    trabajador_id: h.id_empleado,
    huella_template: h.template_huella.toString('base64'),
    id_huella: h.id_huella
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

  if (!primer_nombre || !primer_apellido || !cedula || !id_departamento || !id_cargo || !id_horario || (!huella_template && (!data.huella_templates || data.huella_templates.length === 0))) {
    const error = new Error('Faltan campos obligatorios para el registro (debe registrar al menos una huella)');
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

  const existeEmpleado = await Empleado.findOne({ where: { cedula: numericCedula } });
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

  // Validar huellas idénticas byte a byte
  if (data.huella_templates && Array.isArray(data.huella_templates)) {
    for (const temp of data.huella_templates) {
      const buf = Buffer.from(temp, 'base64');
      const existe = await Huella.findOne({ where: { template_huella: buf } });
      if (existe) {
        const error = new Error('Una de las huellas dactilares ya se encuentra registrada en el sistema.');
        error.statusCode = 409;
        throw error;
      }
    }
  } else if (huella_template) {
    const bufferHuella = Buffer.from(huella_template, 'base64');
    const existeHuellaIdentica = await Huella.findOne({ where: { template_huella: bufferHuella } });
    if (existeHuellaIdentica) {
      const error = new Error('Esta huella dactilar ya se encuentra registrada en el sistema.');
      error.statusCode = 409;
      throw error;
    }
  }

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

  if (data.huella_templates && Array.isArray(data.huella_templates)) {
    for (const temp of data.huella_templates) {
      const buffer = Buffer.from(temp, 'base64');
      await Huella.create({
        id_empleado: nuevoEmpleado.id_empleado,
        template_huella: buffer
      });
    }
  } else if (huella_template) {
    const bufferHuella = Buffer.from(huella_template, 'base64');
    await Huella.create({
      id_empleado: nuevoEmpleado.id_empleado,
      template_huella: bufferHuella
    });
  }

  // Registrar en tabla de Auditoría
  await registrarAuditoria('Empleados', nuevoEmpleado.id_empleado, 'INSERT', null, nuevoEmpleado.toJSON(), req);

  return { trabajador_id: nuevoEmpleado.id_empleado };
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
    include: [Direccion, Cargo, Horario, Huella]
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

async function actualizarTrabajador(id_empleado, data, req) {
  const empleado = await Empleado.findByPk(id_empleado);
  if (!empleado) {
    const error = new Error(`El empleado con ID ${id_empleado} no existe`);
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
        id_empleado: {
          [Op.ne]: empleado.id_empleado
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
  if (data.cedula !== undefined) {
    const numericCedula = parseInt(data.cedula.toString().replace(/\D/g, ''), 10);
    if (isNaN(numericCedula)) {
      const error = new Error('Cédula inválida. Debe contener caracteres numéricos');
      error.statusCode = 400;
      throw error;
    }
    const existeConCedula = await Empleado.findOne({
      where: {
        cedula: numericCedula,
        id_empleado: {
          [Op.ne]: empleado.id_empleado
        }
      }
    });
    if (existeConCedula) {
      const error = new Error(`La cédula ${numericCedula} ya se encuentra asignada a otro empleado`);
      error.statusCode = 409;
      throw error;
    }
    empleado.cedula = numericCedula;
  }

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
  await registrarAuditoria('Empleados', empleado.id_empleado, 'UPDATE', valoresAnteriores, empleado.toJSON(), req);

  return empleado;
}

async function agregarHuella(id_empleado, huella_template, req) {
  if (!id_empleado || !huella_template) {
    const error = new Error('id_empleado y huella_template son requeridos');
    error.statusCode = 400;
    throw error;
  }

  const empleado = await Empleado.findByPk(id_empleado);
  if (!empleado) {
    const error = new Error(`El empleado con ID ${id_empleado} no existe`);
    error.statusCode = 404;
    throw error;
  }

  // Validar seguridad por direccion para Administrador
  if (req && req.user && req.user.rol === 'Administrador') {
    if (empleado.id_direccion !== req.user.id_direccion) {
      const error = new Error('No tiene privilegios para gestionar huellas de otra dirección.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Validar cantidad máxima de huellas
  const totalHuellas = await Huella.count({ where: { id_empleado } });
  if (totalHuellas >= 3) {
    const error = new Error('Límite alcanzado. Solo se permiten hasta 3 huellas por trabajador.');
    error.statusCode = 400;
    throw error;
  }

  const bufferHuella = Buffer.from(huella_template, 'base64');

  // Validar huella idéntica byte a byte
  const existeHuellaIdentica = await Huella.findOne({ where: { template_huella: bufferHuella } });
  if (existeHuellaIdentica) {
    const error = new Error('Esta huella dactilar ya se encuentra registrada en el sistema.');
    error.statusCode = 409;
    throw error;
  }

  const nuevaHuella = await Huella.create({
    id_empleado,
    template_huella: bufferHuella
  });

  await registrarAuditoria('Huellas', nuevaHuella.id_huella, 'INSERT', null, nuevaHuella.toJSON(), req);

  return nuevaHuella;
}

async function eliminarHuella(id_huella, req) {
  const huella = await Huella.findByPk(id_huella, {
    include: [Empleado]
  });
  if (!huella) {
    const error = new Error('Huella no encontrada');
    error.statusCode = 404;
    throw error;
  }

  // Validar seguridad por direccion para Administrador
  if (req && req.user && req.user.rol === 'Administrador') {
    if (huella.Empleado && huella.Empleado.id_direccion !== req.user.id_direccion) {
      const error = new Error('No tiene privilegios para eliminar huellas de otra dirección.');
      error.statusCode = 403;
      throw error;
    }
  }

  const valoresAnteriores = huella.toJSON();
  await huella.destroy();

  await registrarAuditoria('Huellas', id_huella, 'DELETE', valoresAnteriores, null, req);

  return { message: 'Huella eliminada exitosamente' };
}

export {
  getHuellas,
  registrarTrabajador,
  getDepartamentos,
  getCargos,
  getHorarios,
  getTrabajadores,
  actualizarTrabajador,
  agregarHuella,
  eliminarHuella
};
