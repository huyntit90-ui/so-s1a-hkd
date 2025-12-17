import { S1aFormState } from '../types';

export const generateHTMLContent = (data: S1aFormState) => {
    const total = data.transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('vi-VN');
    
    // Rows generation
    const rows = data.transactions.map(t => `
        <tr>
            <td style="border:1px solid black; padding: 5px; text-align: center; vertical-align: top;">${t.date}</td>
            <td style="border:1px solid black; padding: 5px; vertical-align: top;">${t.description}</td>
            <td style="border:1px solid black; padding: 5px; text-align: right; vertical-align: top;">${t.amount.toLocaleString('vi-VN')}</td>
        </tr>
    `).join('');

    // HTML Structure matching the image
    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset='utf-8'>
        <title>Sổ Doanh Thu S1a-HKD</title>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.3; }
            table { border-collapse: collapse; width: 100%; }
            .header-table td { border: none; vertical-align: top; padding: 0; }
            .data-table th, .data-table td { border: 1px solid black; padding: 5px; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .italic { font-style: italic; }
            .uppercase { text-transform: uppercase; }
        </style>
    </head>
    <body>
        <!-- Header Section -->
        <table class="header-table" style="margin-bottom: 20px;">
            <tr>
                <td style="width: 60%;">
                    <p style="margin: 0;"><strong>HỘ, CÁ NHÂN KINH DOANH:</strong> ${data.info.name || '................................'}</p>
                    <p style="margin: 0;"><strong>Địa chỉ:</strong> ${data.info.address || '................................................................'}</p>
                    <p style="margin: 0;"><strong>Mã số thuế:</strong> ${data.info.taxId || '................................'}</p>
                </td>
                <td style="width: 40%; text-align: center;">
                    <p style="margin: 0;" class="bold">Mẫu số S1a-HKD</p>
                    <p style="margin: 0; font-size: 11pt;" class="italic">
                        (Ban hành kèm theo Thông tư số .../2025/TT-BTC<br>
                        ngày ... tháng ... năm 2025 của Bộ trưởng<br>
                        Bộ Tài chính)
                    </p>
                </td>
            </tr>
        </table>

        <!-- Title Section -->
        <div class="center" style="margin-bottom: 15px;">
            <h3 style="margin: 0 0 5px 0; font-size: 14pt;" class="uppercase bold">SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</h3>
            <p style="margin: 0;">Địa điểm kinh doanh: ${data.info.location || '................................'}</p>
            <p style="margin: 0;">Kỳ kê khai: ${data.info.period || '................................'}</p>
        </div>
        
        <!-- Data Table -->
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 120px;" class="center bold">Ngày tháng</th>
                    <th class="center bold">Giao dịch</th>
                    <th style="width: 150px;" class="center bold">Số tiền</th>
                </tr>
                <tr>
                    <th class="center italic" style="font-weight: normal;">A</th>
                    <th class="center italic" style="font-weight: normal;">B</th>
                    <th class="center italic" style="font-weight: normal;">1</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
                
                <!-- Spacer rows if empty -->
                ${data.transactions.length === 0 ? `
                <tr><td style="height: 25px;"></td><td></td><td></td></tr>
                <tr><td style="height: 25px;"></td><td></td><td></td></tr>
                ` : ''}

                <!-- Total Row -->
                <tr>
                    <td style="border: none; border-right: 1px solid black; border-left: 1px solid black;"></td>
                    <td class="center bold">Tổng cộng</td>
                    <td class="right bold">${total}</td>
                </tr>
            </tbody>
        </table>

        <!-- Footer Section -->
        <table class="header-table" style="margin-top: 30px;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    <p class="italic" style="margin: 0;">Ngày ..... tháng ..... năm .......</p>
                    <p class="bold uppercase" style="margin: 5px 0 0 0;">NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/<br>CÁ NHÂN KINH DOANH</p>
                    <p class="italic" style="margin: 0; font-size: 11pt;">(Ký, họ tên, đóng dấu)</p>
                    <br><br><br><br>
                    <p class="bold">${data.info.name}</p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

export const exportToDoc = (data: S1aFormState) => {
    const html = generateHTMLContent(data);
    const blob = new Blob(['\ufeff', html], {
        type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `S1a-HKD-${data.info.name ? data.info.name.replace(/\s+/g, '-') : 'So-Doanh-Thu'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return url;
};

export const exportToExcel = (data: S1aFormState) => {
    const total = data.transactions.reduce((sum, t) => sum + t.amount, 0);

    // Create HTML for Excel with proper MIME type metadata
    const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
        <x:ExcelWorkbook>
        <x:ExcelWorksheets>
        <x:ExcelWorksheet>
        <x:Name>Sổ Doanh Thu</x:Name>
        <x:WorksheetOptions>
        <x:DisplayGridlines/>
        </x:WorksheetOptions>
        </x:ExcelWorksheet>
        </x:ExcelWorksheets>
        </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
            body { font-family: 'Times New Roman'; }
            .header-text { font-weight: bold; }
            .title { font-size: 16pt; font-weight: bold; text-align: center; }
            .table-header { font-weight: bold; text-align: center; background-color: #f0f0f0; border: .5pt solid windowtext; }
            .table-cell { border: .5pt solid windowtext; vertical-align: top; }
            .number-cell { border: .5pt solid windowtext; vertical-align: top; mso-number-format:"\\#\\,\\#\\#0"; text-align: right; }
            .text-cell { border: .5pt solid windowtext; vertical-align: top; mso-number-format:"\\@"; } /* Force Text format */
            .total-cell { border: .5pt solid windowtext; font-weight: bold; mso-number-format:"\\#\\,\\#\\#0"; text-align: right; }
        </style>
    </head>
    <body>
        <table>
            <tr>
                <td colspan="2">HỘ, CÁ NHÂN KINH DOANH: ${data.info.name}</td>
                <td style="text-align: center; font-weight: bold;">Mẫu số S1a-HKD</td>
            </tr>
            <tr>
                <td colspan="2">Địa chỉ: ${data.info.address}</td>
                <td style="text-align: center; font-style: italic;">(Thông tư .../2025/TT-BTC)</td>
            </tr>
            <tr>
                <td colspan="2">Mã số thuế: ${data.info.taxId}</td>
                <td></td>
            </tr>
            <tr><td colspan="3"></td></tr>
            <tr>
                <td colspan="3" class="title">SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</td>
            </tr>
            <tr>
                <td colspan="3" style="text-align: center;">Kỳ kê khai: ${data.info.period}</td>
            </tr>
            <tr><td colspan="3"></td></tr>
            
            <!-- Table Headers -->
            <tr>
                <td class="table-header">Ngày tháng</td>
                <td class="table-header">Giao dịch</td>
                <td class="table-header">Số tiền</td>
            </tr>
            <tr>
                <td class="table-header" style="font-style: italic; font-weight: normal;">A</td>
                <td class="table-header" style="font-style: italic; font-weight: normal;">B</td>
                <td class="table-header" style="font-style: italic; font-weight: normal;">1</td>
            </tr>

            <!-- Data Rows -->
            ${data.transactions.map(t => `
            <tr>
                <td class="text-cell" style="text-align: center;">${t.date}</td>
                <td class="text-cell">${t.description}</td>
                <td class="number-cell">${t.amount}</td>
            </tr>
            `).join('')}

            <!-- Total Row -->
            <tr>
                <td class="table-cell"></td>
                <td class="table-cell" style="font-weight: bold; text-align: center;">Tổng cộng</td>
                <td class="total-cell">${total}</td>
            </tr>

            <tr><td colspan="3"></td></tr>
            <tr>
                <td></td>
                <td></td>
                <td style="text-align: center; font-style: italic;">Ngày ..... tháng ..... năm .......</td>
            </tr>
             <tr>
                <td></td>
                <td></td>
                <td style="text-align: center; font-weight: bold;">NGƯỜI ĐẠI DIỆN</td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const blob = new Blob(['\ufeff', excelContent], {
        type: 'application/vnd.ms-excel'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `S1a-HKD-${data.info.name ? data.info.name.replace(/\s+/g, '-') : 'Export'}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return url;
};

export const exportToJson = (data: S1aFormState) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `S1a-HKD-Backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return url;
};