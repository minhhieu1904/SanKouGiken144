const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { SerialPort } = require('serialport');

const spinner = require('./components/spinner/spinner.js');
const toast = require('./components/toast/toast.js');

const serialPortPath = path.join(__dirname, './serialport-config.json');

const excelInput = document.getElementById('excelFile');
const dataCount = document.getElementById('dataCount');
const dataCountVN = document.getElementById('dataCountVN');

const spPath = document.getElementById('spPath');
const spBaudRate = document.getElementById('spBaudRate');

const scanBarcode = document.getElementById('scanBarcode');
const code = document.getElementById('code');
const order1 = document.getElementById('order1');
const order2 = document.getElementById('order2');
const quantity = document.getElementById('quantity');
const numPage = document.getElementById('numPage');

const FIELD_MAP = [
  { field: 'mã hàng', elementId: 'code' },
  { field: 'order1', elementId: 'order' },
  { field: 'sl', elementId: 'quantity' },
];

const DATA_SHEET_NAME = 'DATA PO TONG';
const TEMPLATE_SHEET_NAME = 'Tem 144';

let dataRows = [];
let currentDataRow = null;
let port;

//#region SerialPort
function initSerialPort() {
  fs.readFile(serialPortPath, 'utf-8', (err, data) => {
    if (data) {
      const config = JSON.parse(data);

      spPath.value = config.path;
      spBaudRate.value = config.baudRate;

      port = new SerialPort({
        path: spPath.value,
        baudRate: Number(spBaudRate.value)
      });


      port.on('data', (data) => {
        scanBarcode.value = data.toString();

        let barcode = scanBarcode.value.startsWith('M') ? scanBarcode.value.substring(1) : scanBarcode.value;

        handleScanCode(barcode?.trim());
      });

      port.on('error', (err) => {
        console.info('SerialPort Error:', err);
      });
    }
  });
}

initSerialPort();

spPath.addEventListener('keydown', (e) => {
  if (e.key === "Enter") {
    const value = e.target.value.trim();

    // xử lý dữ liệu scan
    updateSerialData({
      path: value,
      baudRate: Number(spBaudRate.value)
    });
  }
});

spBaudRate.addEventListener('keydown', (e) => {
  if (e.key === "Enter") {
    const value = e.target.value.trim();

    // xử lý dữ liệu scan
    updateSerialData({
      path: spPath.value,
      baudRate: Number(value)
    });
  }
});

function updateSerialData(newData) {
  try {
    fs.writeFileSync(serialPortPath, JSON.stringify(newData, null, 2), 'utf8');
    toast.success("Settings saved successfully<br>Lưu cài đặt thành công", true);

    port = new SerialPort({
      path: newData.path,
      baudRate: newData.baudRate
    });
  } catch (err) {
    toast.error("Saving settings failed<br>Lưu cài đặt không thành công", true);
  }
}
//#endregion

//#region read data excel
excelInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  spinner.show();

  resetForm();

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const arrayBuffer = e.target.result;

      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });
      if (!workbook.SheetNames.includes(DATA_SHEET_NAME) ||
        !workbook.SheetNames.includes(TEMPLATE_SHEET_NAME)) {
        toast.warning(`The file must have sheets "${DATA_SHEET_NAME}" and "${TEMPLATE_SHEET_NAME}"<br>Tệp phải có sheet "${DATA_SHEET_NAME}" và "${TEMPLATE_SHEET_NAME}"`, true);
        return;
      }

      dataRows = XLSX.utils.sheet_to_json(workbook.Sheets[DATA_SHEET_NAME]);
      if (dataRows.length > 0) {
        dataCount.innerHTML = `There are a total of ${dataRows.length} lines of data.`;
        dataCountVN.innerHTML = `Có tất cả ${dataRows.length} dòng dữ liệu.`;
      }

      scanBarcode.focus();
    } catch (error) {
      toast.warning('Error occurred while reading the file.<br>Xảy ra lỗi khi đọc tệp!', true);
    }
    finally {
      spinner.hide();
    }
  };
  reader.readAsArrayBuffer(file);
});
//#endregion

//#region handle scan code
scanBarcode.addEventListener('keydown', (e) => {
  if (e.key === "Enter") {
    const value = e.target.value.trim();

    handleScanCode(value);
  }
});

function handleScanCode(barcode) {
  console.log('Scanned barcode:', barcode);
  console.log('Data rows:', dataRows);
  const row = dataRows.find(r => {
    const codeKey = findKeyIgnoreCase(r, 'order1');
    return codeKey && r[codeKey] && r[codeKey].toString().trim() === barcode;
  });

  if (!row) {
    toast.warning(`Code "${barcode}" not found in data.<br>Mã "${barcode}" không có trong dữ liệu.`, true);
    resetForm();
    return;
  }

  currentDataRow = row;

  code.value = row[findKeyIgnoreCase(row, 'mã hàng')];
  order1.value = row[findKeyIgnoreCase(row, 'order1')];
  order2.value = row[findKeyIgnoreCase(row, 'order2')];
  quantity.value = row[findKeyIgnoreCase(row, 'sl')];
  numPage.value = 1;

  numPage.focus();
}
//#endregion

//#region print order
numPage.addEventListener('keydown', (e) => {
  if (e.key === "Enter") {
    const value = e.target.value.trim();
    const numPages = Number(value);

    if (isNaN(numPages) || numPages <= 0) {
      toast.warning('Please enter a valid number of pages.<br>Vui lòng nhập số trang hợp lệ.', true);
      return;
    }

    spinner.show();

    let rows = [];
    let totalQuantity = currentDataRow[findKeyIgnoreCase(currentDataRow, 'sl')] ?? 0;

    if (numPages > 1) {
      let cloneDataRow = { ...currentDataRow };
      const totalPages = Math.ceil(totalQuantity / numPages);
      for (let page = 1; page <= totalPages; page++) {
        const quantity = (page === totalPages)
          ? totalQuantity % numPages || numPages
          : numPages;
        let newDataRow = { ...cloneDataRow };
        newDataRow[findKeyIgnoreCase(newDataRow, 'sl')] = quantity;

        rows.push(newDataRow);
      }
    }
    else
      rows.push(currentDataRow);

    const htmlContent = buildPrintHTML(rows, totalQuantity, numPages);
    ipcRenderer.send('print-html', htmlContent);

    ipcRenderer.on('print-done', () => {
      resetForm();

      scanBarcode.focus();
    });
  }
});

function resetForm() {
  scanBarcode.value = null;
  code.value = null;
  order1.value = null;
  order2.value = null;
  quantity.value = null;
  numPage.value = null;
}

function buildPrintHTML(rows, totalQuantity, numPages = 1) {
  const bootstrapPath = path.join(__dirname, 'node_modules/bootstrap/dist/css/bootstrap.min.css');
  const stylePath = path.join(__dirname, 'print.css');

  const pages = rows.map((row) => buildPage(row, totalQuantity, numPages)).join('\n');

  spinner.hide();

  return `
        <html>
          <head>
            <title>Print</title>
            <link rel="stylesheet" href="file://${bootstrapPath}">
            <link rel="stylesheet" href="file://${stylePath}">
          </head>
          <body>
            ${pages}
          </body>
        </html>
    `;
}

function buildPage(row, totalQuantity, numPages = 1) {
  const fieldValues = {};
  FIELD_MAP.forEach(({ field, elementId }) => {
    const key = findKeyIgnoreCase(row, field);
    fieldValues[elementId] = key ? (row[key] ?? '') : '';

    if (elementId === 'quantity' && numPages > 1) {
      fieldValues[elementId] = `${row[key]} / ${totalQuantity}`;
    }
  });

  return `
        <div class="page">
          <table class="table table-bordered">
            <tbody>
              <tr>
                <td class="text-center" colspan="3"><span>SAIKOU GIKEN VIETNAM</span></td>
              </tr>
              <tr>
                <td class="text-center" colspan="3"><span>Số 10, Đ.12, KCN VSIPII-A, Vĩnh Tân, TP.HCM</span></td>
              </tr>
              <tr>
                <td><span>SDT</span></td>
                <td><span>0835.345.345</span></td>
                <td><span>XUẤT XỨ: VIỆT NAM</span></td>
              </tr>
              <tr>
                <td><span>MÃ</span></td>
                <td colspan="2" class="text-center"><span>${fieldValues['code']}</span></td>
              </tr>
              <tr>
                <td><span>ORDER</span></td>
                <td colspan="2" class="text-center"><span>${fieldValues['order']}</span></td>
              </tr>
              <tr>
                <td><span>SL:</span></td>
                <td class="text-center"><span>${fieldValues['quantity']}</span></td>
                <td class="text-center"><span>pcs</span></td>
              </tr>
            </tbody>
          </table>
        </div>
    `;
}

function findKeyIgnoreCase(obj, targetKey) {
  return Object.keys(obj).find(k => k.trim().toLowerCase() === targetKey.trim().toLowerCase());
}
//#endregion