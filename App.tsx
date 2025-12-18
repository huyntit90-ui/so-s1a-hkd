
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Trash2, Plus, ArrowLeft, Download, FileText, DollarSign, FileSpreadsheet, RotateCcw, Smartphone, X, Mail, Sparkles, Database, HardDrive, AlertTriangle, ShieldCheck } from 'lucide-react';
import { S1aFormState, Transaction, AppView, TaxPayerInfo } from './types';
import VoiceInput from './components/VoiceInput';
import PreviewS1a from './components/PreviewS1a';
import { parseTransactionFromAudio, transcribeAudio, transcribeStandardizedInfo } from './services/geminiService';
import { exportToDoc, exportToExcel, generateExcelBlob } from './utils/exportUtils';
import { saveToDB, loadFromDB, clearDB } from './services/db';

const SAMPLE_DATA: S1aFormState = {
  info: {
    name: "Nguyễn Văn A",
    address: "123 Đường Láng, Hà Nội",
    taxId: "8000123456",
    location: "Cửa hàng Tạp hóa Số 1",
    period: "Tháng 10/2023"
  },
  transactions: [
    { id: '1', date: "01/10/2023", description: "Bán hàng tạp hóa lẻ", amount: 2500000 },
    { id: '2', date: "02/10/2023", description: "Cung cấp dịch vụ giao hàng", amount: 500000 },
  ]
};

export default function App() {
  const [view, setView] = useState<AppView>(AppView.EDIT);
  const [data, setData] = useState<S1aFormState>(SAMPLE_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [processingField, setProcessingField] = useState<string | null>(null); 
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const savedData = await loadFromDB();
      if (savedData) setData(savedData);
      setIsLoaded(true);
    };
    initData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    saveToDB(data).catch(err => console.error("Lỗi lưu DB:", err));
  }, [data, isLoaded]);

  const handleReset = async () => {
    await clearDB();
    setData(SAMPLE_DATA);
    setShowResetConfirm(false);
  };

  const handleInfoChange = (field: keyof TaxPayerInfo, value: string) => {
    setData(prev => ({ ...prev, info: { ...prev.info, [field]: value } }));
  };

  const handleVoiceForField = async (field: keyof TaxPayerInfo, label: string, audioBase64: string, mimeType: string) => {
    setProcessingField(field);
    const text = await transcribeStandardizedInfo(audioBase64, label, mimeType);
    if (text) handleInfoChange(field, text);
    setProcessingField(null);
  };

  const addTransaction = () => {
    const newTrans: Transaction = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('vi-VN'),
      description: "",
      amount: 0
    };
    setData(prev => ({ ...prev, transactions: [...prev.transactions, newTrans] }));
  };

  const updateTransaction = (id: string, field: keyof Transaction, value: string | number) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const handleVoiceForTransactionDesc = async (id: string, audioBase64: string, mimeType: string) => {
    setProcessingField(`trans-${id}`);
    const text = await transcribeAudio(audioBase64, mimeType);
    if (text) updateTransaction(id, 'description', text);
    setProcessingField(null);
  };

  const removeTransaction = (id: string) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
  };

  const handleSmartVoiceAdd = async (audioBase64: string, mimeType: string) => {
    if (!audioBase64) return;
    setIsProcessingAI(true);
    setAiFeedback("AI đang phân tích...");
    try {
      const result = await parseTransactionFromAudio(audioBase64, mimeType);
      const newTrans: Transaction = {
        id: Date.now().toString(),
        date: result.date || new Date().toLocaleDateString('vi-VN'),
        description: result.description || "Giao dịch mới",
        amount: result.amount || 0
      };
      setData(prev => ({ ...prev, transactions: [...prev.transactions, newTrans] }));
      setAiFeedback("Đã thêm thành công!");
      setTimeout(() => setAiFeedback(null), 3000);
    } catch (e) {
      setAiFeedback("Không rõ nội dung, thử lại.");
      setTimeout(() => setAiFeedback(null), 3000);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleSaveToDrive = () => {
    exportToExcel(data);
    const confirmed = window.confirm("File Excel đã được tải xuống máy.\n\nNhấn OK để mở Google Drive và tải file này lên để lưu trữ.");
    if (confirmed) {
      window.open('https://drive.google.com/drive/my-drive', '_blank');
    }
  };

  const handleSendExcel = async () => {
    const excelBlob = generateExcelBlob(data);
    const safeName = (data.info.name || 'S1a').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '_');
    const fileName = `${safeName}_S1a.xls`;
    const file = new File([excelBlob], fileName, { type: 'application/vnd.ms-excel' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Sổ S1a-HKD',
          text: `Gửi sổ doanh thu của ${data.info.name}`,
        });
      } catch (error) {
        console.warn('Share error, falling back:', error);
        fallbackEmail(fileName);
      }
    } else {
      fallbackEmail(fileName);
    }
  };

  const fallbackEmail = (fileName: string) => {
    alert(`Thiết bị không hỗ trợ chia sẻ trực tiếp. Tệp ${fileName} sẽ được tải xuống. Hãy đính kèm tệp này vào Email sau đó.`);
    exportToExcel(data);
    setTimeout(() => {
      const subject = encodeURIComponent(`Sổ chi tiết doanh thu S1a-HKD - ${data.info.name}`);
      const body = encodeURIComponent(`Kính gửi,\n\nTôi gửi kèm file Excel sổ chi tiết doanh thu.\n\nTrân trọng!`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }, 1000);
  };

  const formatAmountInput = (amount: number): string => {
    if (amount === 0) return "";
    return amount.toLocaleString('vi-VN');
  };

  const parseAmountInput = (value: string): number => {
    const cleanValue = value.replace(/\./g, '').replace(/[^0-9]/g, '');
    const num = parseInt(cleanValue, 10);
    return isNaN(num) ? 0 : num;
  };

  const renderEditView = () => (
    <div className="space-y-6 pb-32">
      {/* Form thông tin */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-bold text-indigo-800 mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          A. Thông tin chung
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Họ tên HKD", key: "name" as const, placeholder: "Nhập họ tên..." },
            { label: "Mã số thuế", key: "taxId" as const, placeholder: "MST..." },
            { label: "Địa chỉ cư trú", key: "address" as const, placeholder: "Số nhà, Tên đường, Phường, Quận, Tỉnh...", full: true },
            { label: "Địa điểm KD", key: "location" as const, placeholder: "Nơi kinh doanh...", full: true },
            { label: "Kỳ kê khai", key: "period" as const, placeholder: "Tháng/Quý/Năm..." }
          ].map((field) => (
            <div key={field.key} className={`${field.full ? 'md:col-span-2' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.info[field.key]}
                  onChange={(e) => handleInfoChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={processingField === field.key}
                  className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 focus:border-indigo-500 focus:ring-indigo-500 text-sm disabled:bg-gray-100"
                />
                <VoiceInput onAudioCapture={(audio, mime) => handleVoiceForField(field.key, field.label, audio, mime)} isProcessing={processingField === field.key} compact />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danh sách giao dịch */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-bold text-indigo-800 flex items-center mb-4">
          <DollarSign className="w-5 h-5 mr-2" />
          B. Chi tiết Doanh thu
        </h2>
        
        <div className="hidden md:grid grid-cols-12 gap-4 bg-gray-100 p-3 rounded-t-lg font-semibold text-sm text-gray-700">
          <div className="col-span-2">Ngày tháng</div>
          <div className="col-span-6">Nội dung giao dịch</div>
          <div className="col-span-3 text-right">Số tiền (VNĐ)</div>
          <div className="col-span-1 text-center">Xóa</div>
        </div>

        <div className="space-y-3 md:space-y-0">
          {data.transactions.map((item) => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-3 border-b border-gray-100 items-start md:items-center bg-white hover:bg-gray-50 transition-colors">
              <div className="col-span-2 flex items-center gap-2">
                <span className="md:hidden font-medium text-gray-500 text-xs w-16">Ngày:</span>
                <input type="text" value={item.date} onChange={(e) => updateTransaction(item.id, 'date', e.target.value)} className="w-full bg-transparent border-b border-dashed border-gray-300 text-sm py-1" />
              </div>
              <div className="col-span-6 flex items-start gap-2">
                <span className="md:hidden font-medium text-gray-500 text-xs w-16 mt-2">Nội dung:</span>
                <div className="flex-1 flex gap-1 items-center">
                  <textarea value={item.description} onChange={(e) => updateTransaction(item.id, 'description', e.target.value)} rows={1} className="w-full bg-transparent border-b border-dashed border-gray-300 text-sm py-1 resize-none" placeholder="Nhập nội dung..." />
                  <VoiceInput onAudioCapture={(audio, mime) => handleVoiceForTransactionDesc(item.id, audio, mime)} isProcessing={processingField === `trans-${item.id}`} compact className="shrink-0 scale-90" />
                </div>
              </div>
              <div className="col-span-3 flex items-center gap-2 justify-end">
                <span className="md:hidden font-medium text-gray-500 text-xs w-16">Số tiền:</span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={formatAmountInput(item.amount)} 
                  onChange={(e) => updateTransaction(item.id, 'amount', parseAmountInput(e.target.value))} 
                  className="w-full md:text-right bg-transparent border-b border-dashed border-gray-300 text-sm py-1 font-mono font-medium text-indigo-900 focus:outline-none focus:border-indigo-500" 
                  placeholder="0"
                />
              </div>
              <div className="col-span-1 flex justify-end md:justify-center">
                <button onClick={() => removeTransaction(item.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addTransaction} className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 flex items-center justify-center gap-2 font-medium">
          <Plus className="w-5 h-5" /> Thêm dòng thủ công
        </button>
      </div>

      {/* Thanh tác vụ thông minh cố định ở đáy */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 md:p-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.15)] z-40 backdrop-blur-lg bg-white/95">
        <div className="max-w-5xl mx-auto flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setShowResetConfirm(true)} 
            className="p-3 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-2xl transition-all shrink-0 shadow-sm border border-gray-200 active:scale-90"
            title="Tạo sổ mới (Làm mới)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-3 bg-indigo-50 px-4 py-2.5 rounded-2xl border border-indigo-100 shadow-inner">
            <div className="hidden sm:block p-2 bg-indigo-600 rounded-lg text-white"><Sparkles className="w-4 h-4" /></div>
            <div className="flex-1 overflow-hidden">
               <p className="text-xs md:text-sm text-indigo-800 font-bold truncate">
                 {isProcessingAI ? "AI đang lắng nghe..." : aiFeedback ? aiFeedback : "Nói để thêm giao dịch"}
               </p>
               {!isProcessingAI && !aiFeedback && <p className="text-[10px] md:text-xs text-indigo-500 truncate italic">VD: "Bán hàng thu 200 ngàn"</p>}
            </div>
            <VoiceInput onAudioCapture={handleSmartVoiceAdd} isProcessing={isProcessingAI} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg ring-offset-2 ring-indigo-200 scale-110" />
          </div>

          <button onClick={() => setView(AppView.PREVIEW)} className="bg-indigo-900 text-white p-3 md:px-8 md:py-3.5 rounded-2xl font-bold shadow-lg hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0">
            <FileText className="w-5 h-5" />
            <span className="hidden md:inline uppercase tracking-wide">Xem sổ</span>
          </button>
        </div>
      </div>

      {/* Modal xác nhận làm mới */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl scale-in-center overflow-hidden relative border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 animate-bounce-short">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Tạo sổ mới?</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Hành động này sẽ <strong>xóa vĩnh viễn</strong> toàn bộ dữ liệu hiện tại trên máy này. Bạn có chắc chắn muốn tiếp tục?
              </p>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={handleReset}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Đồng ý, xóa hết
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreviewView = () => (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b shadow-sm p-4 flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <button onClick={() => setView(AppView.EDIT)} className="flex items-center text-gray-600 hover:text-indigo-600 font-medium self-start">
          <ArrowLeft className="w-5 h-5 mr-1" /> Quay lại sửa
        </button>
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <button onClick={handleSendExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-green-700 shadow-lg border-2 border-green-400/20 active:scale-95 transition-all">
            <Mail className="w-5 h-5" /> Gửi file Excel
          </button>
          <button onClick={handleSaveToDrive} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-yellow-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-yellow-600 shadow-md active:scale-95 transition-all">
            <HardDrive className="w-5 h-5" /> Lưu
          </button>
        </div>
      </div>
      <div className="overflow-auto pb-10 bg-gray-100 min-h-screen p-4 md:p-8">
         <PreviewS1a data={data} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        {/* Branding Strip */}
        <div className="bg-red-700 text-white py-1.5 px-4 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
          Sổ doanh thu thông minh (AI)
        </div>
        
        <div className="bg-indigo-900 p-8 md:p-12 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 md:gap-4">
              <div className="space-y-0.5 md:space-y-1">
                <p className="text-white/80 font-bold text-xs md:text-base tracking-[0.2em] uppercase opacity-90">CỤC THUẾ</p>
                <p className="text-yellow-400 font-black text-lg md:text-2xl tracking-[0.15em] uppercase drop-shadow-sm">THUẾ TỈNH ĐIỆN BIÊN</p>
              </div>
              
              <h1 className="text-3xl md:text-6xl font-black text-white drop-shadow-lg tracking-tighter uppercase mt-2">
                 Sổ Doanh Thu S1a
              </h1>
              
              <div className="mt-4 flex flex-col md:flex-row items-center gap-3 md:gap-6 justify-center md:justify-start">
                <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <p className="text-indigo-100 text-xs md:text-sm font-bold italic">
                    Ứng dụng hỗ trợ miễn phí cho hộ kinh doanh
                  </p>
                </div>
                
                {view === AppView.EDIT && (
                  <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/20 shadow-xl transition-all hover:bg-white/15">
                    <div className="relative">
                       <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                       <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <span className="text-indigo-50 text-[10px] md:text-xs font-black tracking-widest uppercase">Trạng thái: Online</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {view === AppView.EDIT ? renderEditView() : renderPreviewView()}
      </main>
      
      <style>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-short {
          animation: bounce-short 1s infinite ease-in-out;
        }
        .scale-in-center {
          animation: scale-in-center 0.2s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
        @keyframes scale-in-center {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        header {
          background-image: radial-gradient(circle at 10% 20%, rgba(255,255,255,0.03) 0%, transparent 40%);
        }
      `}</style>
    </div>
  );
}
