import * as trabajadoresService from '../services/trabajadoresService.js';

export async function getHuellas(req, res) {
  try {
    const huellas = await trabajadoresService.getHuellas();
    return res.json(huellas);
  } catch (error) {
    console.error('Error al obtener huellas para sincronización:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno al obtener huellas' });
  }
}

export async function registrarTrabajador(req, res) {
  try {
    const result = await trabajadoresService.registrarTrabajador(req.body, req);
    return res.status(201).json({
      status: 'success',
      trabajador_id: result.trabajador_id
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error al registrar trabajador:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor al registrar trabajador' });
  }
}

export async function getDepartamentos(req, res) {
  try {
    const departamentos = await trabajadoresService.getDepartamentos();
    return res.json(departamentos);
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function getCargos(req, res) {
  try {
    const cargos = await trabajadoresService.getCargos();
    return res.json(cargos);
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function getHorarios(req, res) {
  try {
    const horarios = await trabajadoresService.getHorarios();
    return res.json(horarios);
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function getTrabajadores(req, res) {
  try {
    const trabajadores = await trabajadoresService.getTrabajadores(req);
    return res.json(trabajadores);
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function actualizarTrabajador(req, res) {
  try {
    const { cedula } = req.params;
    const result = await trabajadoresService.actualizarTrabajador(cedula, req.body, req);
    return res.json({
      status: 'success',
      message: 'Trabajador actualizado con éxito',
      data: result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error('Error al actualizar trabajador:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor al actualizar trabajador' });
  }
}
