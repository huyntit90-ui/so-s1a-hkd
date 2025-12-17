import React from 'react';
import { S1aFormState } from '../types';

interface PreviewProps {
  data: S1aFormState;
}

const PreviewS1a: React.FC<PreviewProps> = ({ data }) => {
  const totalAmount = data.transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="bg-white p-8 md:p-12 max-w-[210mm] mx-auto shadow-lg border border-gray-200 text-black font-serif text-sm leading-relaxed" id="s1a-preview">
      <style>{`
        .preview-table th, .preview-table td { border: 1px solid black; padding: 8px; }
      `}</style>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="w-[60%]">
          <p className="font-bold mb-1">HỘ, CÁ NHÂN KINH DOANH: <span className="font-normal">{data.info.name || "........................"}</span></p>
          <p className="font-bold mb-1">Địa chỉ: <span className="font-normal">{data.info.address || "................................................"}</span></p>
          <p className="font-bold mb-1">Mã số thuế: <span className="font-normal">{data.info.taxId || "........................"}</span></p>
        </div>
        <div className="w-[40%] text-center">
          <p className="font-bold">Mẫu số S1a-HKD</p>
          <p className="italic text-xs leading-tight">
            (Ban hành kèm theo Thông tư số .../2025/TT-BTC<br/>
            ngày ... tháng ... năm 2025 của Bộ trưởng<br/>
            Bộ Tài chính)
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold uppercase mb-2">SỔ CHI TIẾT DOANH THU BÁN HÀNG HÓA, DỊCH VỤ</h1>
        <p className="mb-1">Địa điểm kinh doanh: {data.info.location || "................................"}</p>
        <p>Kỳ kê khai: {data.info.period || "................................"}</p>
      </div>

      {/* Table */}
      <table className="w-full border-collapse mb-6 preview-table">
        <thead>
          <tr className="bg-white">
            <th className="text-center w-32">Ngày tháng</th>
            <th className="text-center">Giao dịch</th>
            <th className="text-center w-40">Số tiền</th>
          </tr>
          <tr>
            <th className="text-center italic font-normal">A</th>
            <th className="text-center italic font-normal">B</th>
            <th className="text-center italic font-normal">1</th>
          </tr>
        </thead>
        <tbody>
          {data.transactions.length === 0 ? (
            <tr>
              <td colSpan={3} className="p-4 text-center text-gray-400 italic border border-black">Chưa có dữ liệu</td>
            </tr>
          ) : (
            data.transactions.map((t, idx) => (
              <tr key={t.id || idx}>
                <td className="text-center align-top">{t.date}</td>
                <td className="align-top">{t.description}</td>
                <td className="text-right align-top">{t.amount.toLocaleString('vi-VN')}</td>
              </tr>
            ))
          )}
          
          {/* Total Row */}
          <tr className="font-bold">
            <td className="border-l border-r border-black border-b-0"></td> {/* Empty cell under Date */}
            <td className="text-center">Tổng cộng</td>
            <td className="text-right">{totalAmount.toLocaleString('vi-VN')}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex justify-end mt-8">
        <div className="text-center w-1/2">
          <p className="italic mb-2">Ngày ..... tháng ..... năm .......</p>
          <p className="font-bold uppercase">NGƯỜI ĐẠI DIỆN HỘ KINH DOANH/<br/>CÁ NHÂN KINH DOANH</p>
          <p className="italic text-xs mt-1">(Ký, họ tên, đóng dấu)</p>
          <div className="h-24"></div>
          <p className="font-bold">{data.info.name}</p>
        </div>
      </div>
    </div>
  );
};

export default PreviewS1a;