/**
 * Relevamiento de Comercios · Curuzú Cuatiá — Backend
 * Script ENLAZADO a la planilla (Extensiones ▸ Apps Script desde el Google Sheet).
 * Script STANDALONE (proyecto suelto). Escribe en la planilla indicada por SHEET_ID
 * mediante SpreadsheetApp.openById().
 *
 * Despliegue: Implementar ▸ Nueva implementación ▸ Aplicación web
 *   - Ejecutar como: Yo
 *   - Quién tiene acceso: Cualquiera
 * Copiar la URL /exec y pegarla en la app (Ajustes ▸ URL del backend).
 * IMPORTANTE: cada vez que edites el código, creá una NUEVA implementación
 * (o "Administrar implementaciones ▸ editar ▸ Versión: Nueva") para que los cambios tomen efecto.
 */

var HOJA = 'Relevamiento';
var CARPETA_FOTOS = 'Relevamiento_Comercios_Fotos';
var SHEET_ID = '1pMmhFeig93Ss6ZjZYd12b1nA5jbnCgXnC7xbmUgud8w'; // planilla destino (script standalone)

/**
 * Crea el menú "Relevamiento" al abrir la planilla.
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Relevamiento')
      .addItem('Configurar y proteger', 'setup')
      .addToUi();
  } catch (e) {}
}

/**
 * Deja la planilla lista: crea/verifica la hoja de relevamiento y PROTEGE
 * el Padrón y el Panel para que no se puedan editar ni borrar por accidente.
 * Ejecutar una sola vez (menú Relevamiento ▸ Configurar y proteger).
 */
function setup() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  _getSheet(); // asegura la hoja "Relevamiento" con encabezados
  _protegerHoja(ss, 'Padrón', 'Padrón base — no modificar (protegido automáticamente)');
  _protegerHoja(ss, 'Panel', 'Panel de avance — no modificar (protegido automáticamente)');
  _protegerEncabezado(ss, HOJA);
  try {
    SpreadsheetApp.getUi().alert('Listo ✓\nPadrón y Panel quedaron protegidos.\nLa hoja "Relevamiento" recibe los datos de la app.');
  } catch (e) {
    Logger.log('setup() completado: Padrón y Panel protegidos.');
  }
}

/** Protege una hoja entera: solo el dueño puede editarla o borrarla. */
function _protegerHoja(ss, nombre, desc) {
  var sh = ss.getSheetByName(nombre);
  if (!sh) return;
  sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
  var pr = sh.protect().setDescription(desc);
  var me = Session.getEffectiveUser();
  pr.addEditor(me);
  var otros = pr.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); });
  if (otros.length) pr.removeEditors(otros);
  if (pr.canDomainEdit()) pr.setDomainEdit(false);
}

/** Protege solo la fila de encabezados de una hoja (los datos siguen editables). */
function _protegerEncabezado(ss, nombre) {
  var sh = ss.getSheetByName(nombre);
  if (!sh) return;
  var rango = sh.getRange(1, 1, 1, CAMPOS.length);
  var prev = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  prev.forEach(function (p) { if (p.getDescription() === 'Encabezados') p.remove(); });
  var pr = rango.protect().setDescription('Encabezados');
  var me = Session.getEffectiveUser();
  pr.addEditor(me);
  var otros = pr.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); });
  if (otros.length) pr.removeEditors(otros);
  if (pr.canDomainEdit()) pr.setDomainEdit(false);
}

var CAMPOS = [
  'id','fecha','encuestador','zona','partida','estado',
  'nombre_fantasia','titular','cuit','rubro','rubro_otro',
  'calle','altura','entre_calles','lat','lng','gps_precision','gps_metodo',
  'telefono','whatsapp','email','redes','horario','dias','empleados','anio_inicio',
  'observaciones','foto_url'
];

function doGet(e) {
  var cb = e && e.parameter ? e.parameter.callback : null;
  var accion = e && e.parameter ? e.parameter.action : null;
  var out;
  if (accion === 'resumen') {
    out = _resumen();
  } else {
    out = { ok: true, servicio: 'Relevamiento de Comercios CC', hoja: HOJA };
  }
  return cb ? _jsonp(cb, out) : _json(out);
}

/** Conteos de avance para el tablero de cobertura. */
function _resumen() {
  var sh = _getSheet();
  var last = sh.getLastRow();
  var res = { ok: true, total: 0, porCalle: {}, porZona: {}, porEncuestador: {} };
  if (last < 2) return res;
  var idx = {};
  for (var c = 0; c < CAMPOS.length; c++) idx[CAMPOS[c]] = c;
  var rows = sh.getRange(2, 1, last - 1, CAMPOS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    var calle = rows[i][idx.calle] || '(sin calle)';
    var zona = rows[i][idx.zona] || 'Sin dato';
    var enc = rows[i][idx.encuestador] || '(sin encuestador)';
    res.porCalle[calle] = (res.porCalle[calle] || 0) + 1;
    res.porZona[zona] = (res.porZona[zona] || 0) + 1;
    res.porEncuestador[enc] = (res.porEncuestador[enc] || 0) + 1;
    res.total++;
  }
  return res;
}

function _jsonp(cb, obj) {
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(obj) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var fichas = body.fichas || [];
    var sheet = _getSheet();
    var idCol = _indexById(sheet);
    var saved = [];

    for (var i = 0; i < fichas.length; i++) {
      var f = fichas[i];
      var fotoUrl = '';
      if (f.foto && f.foto.indexOf('data:image') === 0) {
        fotoUrl = _guardarFoto(f.foto, f.id);
      }
      var row = _fichaToRow(f, fotoUrl);
      if (idCol[f.id]) {
        sheet.getRange(idCol[f.id], 1, 1, CAMPOS.length).setValues([row]); // update
      } else {
        sheet.appendRow(row); // insert
        idCol[f.id] = sheet.getLastRow();
      }
      saved.push(f.id);
    }
    return _json({ ok: true, saved: saved });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function _getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(HOJA);
  if (!sh) {
    sh = ss.insertSheet(HOJA);
    sh.appendRow(CAMPOS);
    sh.getRange(1, 1, 1, CAMPOS.length).setFontWeight('bold').setBackground('#273B84').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

function _indexById(sheet) {
  var idx = {};
  var last = sheet.getLastRow();
  if (last < 2) return idx;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0]) idx[ids[i][0]] = i + 2;
  }
  return idx;
}

function _fichaToRow(f, fotoUrl) {
  var g = f.gps || {};
  return [
    f.id || '', f.ts || new Date().toISOString(), f.encuestador || '', f.zona || '',
    f.partida || '', f.estado || '', f.fant || '', f.tit || '', f.cuit || '',
    f.rubro || '', f.rubro_otro || '', f.calle || '', f.alt || '', f.entre || '',
    g.lat || '', g.lng || '', g.acc || '', g.metodo || '',
    f.tel || '', f.wa || '', f.email || '', f.redes || '', f.horario || '',
    (f.dias || []).join(', '), f.emp || '', f.anio || '', f.obs || '', fotoUrl
  ];
}

function _guardarFoto(dataUrl, id) {
  try {
    var partes = dataUrl.split(',');
    var contentType = partes[0].match(/data:(.*?);/)[1];
    var bytes = Utilities.base64Decode(partes[1]);
    var blob = Utilities.newBlob(bytes, contentType, (id || 'foto') + '.jpg');
    var carpeta = _getCarpeta();
    var file = carpeta.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return 'ERROR_FOTO';
  }
}

function _getCarpeta() {
  var it = DriveApp.getFoldersByName(CARPETA_FOTOS);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FOTOS);
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
