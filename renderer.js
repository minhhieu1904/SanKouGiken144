const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const excelInput = document.getElementById('excelFile');
const btnPrint = document.getElementById('btnPrint');

const spinner = {
  show() {
    document.getElementById('spinner').classList.add('active');
  },
  hide() {
    document.getElementById('spinner').classList.remove('active');
  }
};

const FIELD_MAP = [
  { field: 'mã hàng', elementId: 'code' },
  { field: 'order1', elementId: 'order' },
  { field: 'sl', elementId: 'quantity' },
];

const DATA_SHEET_NAME = 'DATA PO TONG';
const TEMPLATE_SHEET_NAME = 'Tem 144';

let dataRows = [];

excelInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  spinner.show();

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const arrayBuffer = e.target.result;

      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });
      if (!workbook.SheetNames.includes(DATA_SHEET_NAME) ||
        !workbook.SheetNames.includes(TEMPLATE_SHEET_NAME)) {
        warning(`The file must have sheets "${DATA_SHEET_NAME}" and "${TEMPLATE_SHEET_NAME}"<br>Tệp phải có sheet "${DATA_SHEET_NAME}" và "${TEMPLATE_SHEET_NAME}"`, true);
        return;
      }

      dataRows = XLSX.utils.sheet_to_json(workbook.Sheets[DATA_SHEET_NAME]);
    } catch (error) {
      warning('Error occurred while reading the file.<br>Xảy ra lỗi khi đọc tệp!', true);
    }
    finally {
      spinner.hide();
    }
  };
  reader.readAsArrayBuffer(file);
});

btnPrint.addEventListener('click', async () => {
  if (!dataRows.length) {
    warning('No data. Please check your Excel file again!<br>Chưa có dữ liệu. Hãy kiểm tra lại file Excel!', true);
    return;
  }

  spinner.show();
  const html = buildPrintHTML(dataRows);
  ipcRenderer.send('print-html', html);
});

function buildPrintHTML(rows) {
  const bootstrapPath = path.join(__dirname, 'node_modules/bootstrap/dist/css/bootstrap.min.css');
  const stylePath = path.join(__dirname, 'style.css');

  const pages = rows.map((row) => buildPage(row)).join('\n');

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

function buildPage(row) {
  const fieldValues = {};
  FIELD_MAP.forEach(({ field, elementId }) => {
    const key = Object.keys(row).find(k => k.trim().toLowerCase() === field.toLowerCase());
    fieldValues[elementId] = key ? (row[key] ?? '') : '';
  });

  return `
        <div class="page mt-5 p-5">
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