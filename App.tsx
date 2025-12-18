
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Trash2, Plus, ArrowLeft, Download, FileText, DollarSign, FileSpreadsheet, RotateCcw, Smartphone, X, Mail, Sparkles, Database, HardDrive, AlertTriangle, ShieldCheck, Key, HelpCircle, ExternalLink, Settings, PlayCircle, RefreshCw, CheckCircle2, WifiOff, Copy, Check, Search, FolderOpen, CloudUpload, Monitor } from 'lucide-react';
import { S1aFormState, Transaction, AppView, TaxPayerInfo } from './types';
import VoiceInput from './components/VoiceInput';
import PreviewS1a from './components/PreviewS1a';
import InstallPWA from './components/InstallPWA';
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
  const [apiKeyError, setApiKeyError] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const savedData = await loadFromDB();
      if (savedData) setData(savedData);
      setIsLoaded(true);
      
      if (!process.env.API_KEY || process.env.API_KEY === "" || process.env.API_KEY === "undefined") {
        setApiKeyError(true);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    saveToDB(data).catch(err => console.error("Lỗi lưu DB:", err));
  }, [data, isLoaded]);

  const handleCopyCmd = () => {
    navigator.clipboard.writeText("git push -u origin main --force");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = async () => {
    await clearDB();
    setData(SAMPLE_DATA);
    setShowResetConfirm(false);
  };

  const handleInfoChange = (field: keyof TaxPayerInfo, value: string) => {
    setData(prev => ({ ...prev, info: { ...prev.info, [field]: value } }));
  };

  const handleError = (e: any) => {
    if (e.message === "API_KEY_MISSING") {
      setApiKeyError(true);
      setShowHelpModal(true);
    } else {
      setAiFeedback("Lỗi kết nối AI. Thử lại sau.");
      setTimeout(() => setAiFeedback(null), 3000);
    }
  };

  const handleVoiceForField = async (field: keyof TaxPayerInfo, label: string, audioBase64: string, mimeType: string) => {
    setProcessingField(field);
    try {
      const text = await transcribeStandardizedInfo(audioBase64, label, mimeType);
      if (text) handleInfoChange(field, text);
    } catch (e) {
      handleError(e);
    } finally {
      setProcessingField(null);
    }
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
    try {
      const text = await transcribeAudio(audioBase64, mimeType);
      if (text) updateTransaction(id, 'description', text);
    } catch (e) {
      handleError(e);
    } finally {
      setProcessingField(null);
    }
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
      handleError(e);
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
          title: 'Sổ doanh thu AI',
          text: `Gửi sổ doanh thu của ${data.info.name}`,
        });
      } catch (error) {
        fallbackEmail(fileName);
      }
    } else {
      fallbackEmail(fileName);
    }
  };

  const fallbackEmail = (fileName: string) => {
    alert(`Tệp ${fileName} sẽ được tải xuống. Hãy đính kèm tệp này vào Email.`);
    exportToExcel(data);
    setTimeout(() => {
      const subject = encodeURIComponent(`Sổ chi tiết doanh thu S1a-HKD - ${data.info.name}`);
      window.location.href = `mailto:?subject=${subject}`;
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
      {/* System Status Bar */}
      <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${apiKeyError ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
           <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
             AI Status: {apiKeyError ? 'Cấu hình lỗi' : 'Sẵn sàng'}
           </span>
        </div>
        <button onClick={() => setShowHelpModal(true)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter">
           <HelpCircle className="w-3 h-3" /> Hướng dẫn cho bạn
        </button>
      </div>

      {/* Banner cảnh báo API Key */}
      {apiKeyError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in fade-in slide-in-from-top duration-500">
          <Key className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-sm">Chưa có chìa khóa AI (API Key)</h3>
            <p className="text-red-700 text-xs mt-1 leading-relaxed">
              Bạn cần đưa code lên GitHub và cấu hình API Key để tính năng giọng nói hoạt động.
            </p>
            <button 
              onClick={() => setShowHelpModal(true)}
              className="mt-3 text-xs font-bold text-white bg-red-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm shadow-red-100"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Xem hướng dẫn đưa lên mạng
            </button>
          </div>
        </div>
      )}

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
                  className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
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

      {/* Thanh tác vụ cố định */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 md:p-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.15)] z-40 backdrop-blur-lg bg-white/95">
        <div className="max-w-5xl mx-auto flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setShowResetConfirm(true)} 
            className="p-3 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-2xl transition-all shrink-0 shadow-sm border border-gray-200 active:scale-90"
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

      <InstallPWA />

      {/* Modal Help Cải tiến cho người dùng Online */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-auto">
            <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            
            <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6" /> Hướng dẫn cho người dùng Online
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CỘT 1: Hướng dẫn Online */}
              <div className="space-y-4">
                <section className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 h-full">
                  <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
                    <CloudUpload className="w-5 h-5" /> A. Cách Đưa Lên Mạng (Không dùng lệnh)
                  </h3>
                  <div className="text-[11px] text-indigo-800 space-y-3">
                     <p className="flex items-start gap-2">
                       <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 font-bold">1</span>
                       Trên menu web này, tìm nút <b>Download</b> hoặc <b>Export ZIP</b> để tải code về máy.
                     </p>
                     <p className="flex items-start gap-2">
                       <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 font-bold">2</span>
                       Giải nén thư mục vừa tải (Bạn sẽ thấy file <b>App.tsx</b>...).
                     </p>
                     <p className="flex items-start gap-2">
                       <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 font-bold">3</span>
                       Vào <a href="https://github.com/new" target="_blank" className="underline font-bold">GitHub.com</a> tạo Repo mới. Chọn dòng <b>"uploading an existing file"</b>.
                     </p>
                     <p className="flex items-start gap-2">
                       <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 font-bold">4</span>
                       Kéo toàn bộ file đã giải nén vào đó và nhấn <b>Commit</b>. Xong!
                     </p>
                  </div>
                </section>
              </div>

              {/* CỘT 2: Hướng dẫn Chuyên sâu/Dưới máy */}
              <div className="space-y-4">
                <section className="bg-gray-50 p-4 rounded-2xl border border-gray-100 h-full">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                    <Monitor className="w-5 h-5" /> B. Nếu bạn dùng Terminal (Máy tính)
                  </h3>
                  <div className="text-[11px] text-gray-700 space-y-3">
                    <p>Mở thư mục code trên máy tính. Click thanh địa chỉ, gõ <code>cmd</code> rồi Enter. Dán lệnh này:</p>
                    <div className="bg-black p-3 rounded-lg flex items-center justify-between gap-2 overflow-hidden">
                       <code className="text-green-400 text-[10px] truncate">git push -u origin main --force</code>
                       <button onClick={handleCopyCmd} className="shrink-0 bg-white/10 p-1.5 rounded-md text-white">
                         {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                       </button>
                    </div>
                    <p className="text-[10px] italic">Sử dụng khi gặp lỗi "Something went wrong".</p>
                  </div>
                </section>
              </div>

              {/* BƯỚC CUỐI: API KEY */}
              <div className="md:col-span-2">
                <section className="bg-green-50 p-4 rounded-2xl border border-green-100">
                  <h3 className="font-bold text-green-900 flex items-center gap-2 mb-2">
                    <Key className="w-5 h-5" /> C. Cấu hình để AI nói được
                  </h3>
                  <p className="text-[11px] text-green-800 leading-relaxed">
                    Sau khi code đã lên GitHub, vào <b>Settings > Secrets > Actions</b>. Thêm 1 cái tên là <b>API_KEY</b> và dán mã chìa khóa AI của bạn vào đó. 
                    GitHub sẽ tự động "nấu" lại ứng dụng và kích hoạt AI cho bạn.
                  </p>
                </section>
              </div>
            </div>

            <button 
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full bg-indigo-900 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              Tôi đã hiểu, cảm ơn bạn!
            </button>
          </div>
        </div>
      )}

      {/* Modal reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-sm w-full p-8 shadow-2xl relative border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Tạo sổ mới?</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Hành động này sẽ xóa dữ liệu hiện tại. Bạn có chắc không?
              </p>
              <div className="flex flex-col w-full gap-3">
                <button onClick={handleReset} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold">Xác nhận xóa</button>
                <button onClick={() => setShowResetConfirm(false)} className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">Hủy</button>
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
          <button onClick={handleSendExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg">
            <Mail className="w-5 h-5" /> Gửi file Excel
          </button>
          <button onClick={handleSaveToDrive} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-yellow-500 text-white px-6 py-3 rounded-xl text-sm font-bold">
            <HardDrive className="w-5 h-5" /> Lưu Drive
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
      <header className="bg-indigo-900 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-900 rounded-full translate-y-1/2 -translate-x-1/2 opacity-30 blur-2xl"></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
            <p className="text-yellow-400 font-black text-lg md:text-2xl tracking-widest uppercase">CỤC THUẾ TỈNH ĐIỆN BIÊN</p>
            <h1 className="text-3xl md:text-6xl font-black text-white uppercase mt-2">Sổ doanh thu AI</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 justify-center md:justify-start">
              <div className="bg-black/20 px-4 py-2 rounded-xl border border-white/10 text-white text-[10px] md:text-xs font-bold flex items-center gap-2 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-yellow-400" /> AI Hỗ trợ Hộ Kinh Doanh
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {view === AppView.EDIT ? renderEditView() : renderPreviewView()}
      </main>
    </div>
  );
}
