// ===== VARIABLES =====
let datos = JSON.parse(localStorage.getItem("finanzas")) || {};
let tipoActual = "ingreso";
let editandoId = null;
let saldoVisible = true;

// ===== UTILIDADES FECHA =====
function obtenerFechaActual() {
  const hoy = new Date();
  return {
    año: hoy.getFullYear().toString(),
    mes: String(hoy.getMonth() + 1).padStart(2, "0"),
    fechaCompleta: hoy.toISOString().split("T")[0]
  };
}

function obtenerMesAnterior(año, mes) {
  let m = parseInt(mes);
  let a = parseInt(año);

  if (m === 1) {
    return { año: (a - 1).toString(), mes: "12" };
  } else {
    return { año: año, mes: String(m - 1).padStart(2, "0") };
  }
}

// ===== INICIALIZAR MES =====
function inicializarMes(año, mes) {
  if (!datos[año]) datos[año] = {};
  if (!datos[año][mes]) {

    const anterior = obtenerMesAnterior(año, mes);
    let saldoInicial = 0;

    if (
      datos[anterior.año] &&
      datos[anterior.año][anterior.mes]
    ) {
      saldoInicial =
        calcularSaldoMes(anterior.año, anterior.mes);
    }

    datos[año][mes] = {
      saldoInicial,
      movimientos: []
    };
  }
}

// ===== CALCULAR SALDO =====
function calcularSaldoMes(año, mes) {
  const mesData = datos[año]?.[mes];
  if (!mesData) return 0;

  let saldo = mesData.saldoInicial;

  mesData.movimientos.forEach(m => {
    if (m.tipo === "ingreso") saldo += m.monto;
    else saldo -= m.monto;
  });

  return saldo;
}

// ===== GUARDAR LOCAL =====
function guardarLocal() {
  localStorage.setItem("finanzas", JSON.stringify(datos));
}

// ===== MOSTRAR SALDO =====
function actualizarSaldo() {
  const { año, mes } = obtenerFechaActual();
  inicializarMes(año, mes);
  const saldo = calcularSaldoMes(año, mes);

  const saldoElemento = document.getElementById("saldo");

  if (saldoVisible) {
    saldoElemento.textContent = "$" + saldo.toLocaleString();
  } else {
    saldoElemento.textContent = "*****";
  }
}

// ===== AGREGAR O EDITAR =====
function guardarMovimiento() {
  const montoInput = document.getElementById("monto");
  const descInput = document.getElementById("descripcion");

  const monto = parseFloat(montoInput.value);
  const descripcion = descInput.value.trim();

  if (!monto || !descripcion) return;

  const { año, mes, fechaCompleta } = obtenerFechaActual();
  inicializarMes(año, mes);

  const movimientos = datos[año][mes].movimientos;

  if (editandoId) {
    const mov = movimientos.find(m => m.id === editandoId);
    mov.monto = monto;
    mov.descripcion = descripcion;
    mov.tipo = tipoActual;
    editandoId = null;
  } else {
    movimientos.push({
      id: Date.now().toString(),
      fecha: fechaCompleta,
      tipo: tipoActual,
      monto,
      descripcion
    });
  }

  montoInput.value = "";
  descInput.value = "";

  guardarLocal();
  actualizarSaldo();
  renderMovimientos();
}

// ===== RENDER MOVIMIENTOS =====
function renderMovimientos() {
  const lista = document.getElementById("listaMovimientos");
  lista.innerHTML = "";

  const { año, mes } = obtenerFechaActual();
  const actual = datos[año]?.[mes]?.movimientos || [];

  const anterior = obtenerMesAnterior(año, mes);
  const anteriores =
    datos[anterior.año]?.[anterior.mes]?.movimientos || [];

  const ultimosAnteriores = anteriores.slice(-3);

  const mostrar = [...actual, ...ultimosAnteriores];

  mostrar.reverse().forEach(m => {
    const div = document.createElement("div");
    div.className = "movimiento";

    div.innerHTML = `
      <span>${m.descripcion} - $${m.monto}</span>
      <div>
        <button onclick="editar('${m.id}')">✏</button>
        <button onclick="eliminar('${m.id}')">🗑</button>
      </div>
    `;

    lista.appendChild(div);
  });
}

// ===== EDITAR =====
function editar(id) {
  for (let año in datos) {
    for (let mes in datos[año]) {
      const mov = datos[año][mes].movimientos.find(m => m.id === id);
      if (mov) {
        document.getElementById("monto").value = mov.monto;
        document.getElementById("descripcion").value = mov.descripcion;
        tipoActual = mov.tipo;
        editandoId = id;
        return;
      }
    }
  }
}

// ===== ELIMINAR =====
function eliminar(id) {
  for (let año in datos) {
    for (let mes in datos[año]) {
      datos[año][mes].movimientos =
        datos[año][mes].movimientos.filter(m => m.id !== id);
    }
  }

  guardarLocal();
  actualizarSaldo();
  renderMovimientos();
}

// ===== EXPORTAR EXCEL =====
function exportarExcel() {
  const año = prompt("Ingrese el año a exportar (ej: 2026)");
  if (!año || !datos[año]) return;

  const wb = XLSX.utils.book_new();

  Object.keys(datos[año]).forEach(mes => {
    const mesData = datos[año][mes];

    const ingresos = mesData.movimientos
      .filter(m => m.tipo === "ingreso")
      .map(m => ({ Fecha: m.fecha, Descripción: m.descripcion, Monto: m.monto }));

    const gastos = mesData.movimientos
      .filter(m => m.tipo === "gasto")
      .map(m => ({ Fecha: m.fecha, Descripción: m.descripcion, Monto: m.monto }));

    const wsData = [
      ["INGRESOS"],
      ["Fecha", "Descripción", "Monto"],
      ...ingresos.map(i => [i.Fecha, i.Descripción, i.Monto]),
      [],
      ["GASTOS"],
      ["Fecha", "Descripción", "Monto"],
      ...gastos.map(g => [g.Fecha, g.Descripción, g.Monto]),
      [],
      ["Saldo Final", calcularSaldoMes(año, mes)]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, mes);
  });

  XLSX.writeFile(wb, `Finanzas_${año}.xlsx`);
}

// ===== EVENTOS =====
document.getElementById("guardar").onclick = guardarMovimiento;
document.getElementById("cancelar").onclick = () => {
  document.getElementById("monto").value = "";
  document.getElementById("descripcion").value = "";
  editandoId = null;
};

document.getElementById("btnIngreso").onclick = () => {
  tipoActual = "ingreso";
  document.getElementById("btnIngreso").classList.add("active");
  document.getElementById("btnGasto").classList.remove("active");
};

document.getElementById("btnGasto").onclick = () => {
  tipoActual = "gasto";
  document.getElementById("btnGasto").classList.add("active");
  document.getElementById("btnIngreso").classList.remove("active");
};

document.getElementById("toggleSaldo").onclick = () => {
  saldoVisible = !saldoVisible;
  actualizarSaldo();
};

document.getElementById("exportarExcel").onclick = exportarExcel;

// ===== INICIO =====
actualizarSaldo();
renderMovimientos();
