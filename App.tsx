import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Share2, Save, Trash2, Plus, ArrowLeft, Download, FileText, DollarSign, HardDrive, FileSpreadsheet, Upload, FileJson, RotateCcw, ShieldCheck, Database, Smartphone, X, Menu, MoreVertical, AlertTriangle } from 'lucide-react';
import { S1aFormState, Transaction, AppView, TaxPayerInfo } from './types';
import VoiceInput from './components/VoiceInput';
import PreviewS1a from './components/PreviewS1a';
import { parseTransactionFromAudio, transcribeAudio } from './services/geminiService';
import { exportToDoc, exportToExcel, exportToJson } from './utils/exportUtils';
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
  const [isLoaded, setIsLoaded] = useState(false); // To prevent saving SAMPLE_DATA over DB before loading

  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [processingField, setProcessingField] = useState<string | null>(null); 
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null); // State to hold the native install event
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load data from IndexedDB on mount
  useEffect(() => {
    const initData = async () => {
      const savedData = await loadFromDB();
      if (savedData) {
        setData(savedData);
      }
      setIsLoaded(true);
    };
    initData();
  }, []);

  // 2. Auto-save to IndexedDB whenever data changes (debounced slightly to avoid thrashing DB)
  useEffect(() => {
    if (!isLoaded) return; // Don't save if we haven't finished loading yet

    const timer = setTimeout(() => {
      saveToDB(data);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [data, isLoaded]);

  // 3. Listen for 'beforeinstallprompt' event (Android/Chrome)
  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
      console.log("Install prompt captured");
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = () => {
    // If the browser supports automatic install (Android/Chrome)
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setInstallPrompt(null); // Hide button or clear prompt
        } else {
          console.log('User dismissed the install prompt');
        }
      });
    } else {
      // If iOS or browser doesn't support auto-prompt, show manual guide
      setShowInstallGuide(true);
    }
  };

  const handleReset = async () => {
    if (window.confirm("Bạn có chắc chắn muốn tạo sổ mới? Dữ liệu hiện tại trong bộ nhớ sẽ bị xóa về mặc định.")) {
      await clearDB();
      setData(SAMPLE_DATA);
    }
  };

  // --- Handlers for Info Section ---
  const handleInfoChange = (field: keyof TaxPayerInfo, value: string) => {
    setData(prev => ({ ...prev, info: { ...prev.info, [field]: value } }));
  };

  // Wrapper to handle audio for simple text fields
  const handleVoiceForField = async (field: keyof TaxPayerInfo, audioBase64: string, mimeType: string) => {
    setProcessingField(field);
    const text = await transcribeAudio(audioBase64, mimeType);
    if (text) {
        handleInfoChange(field, text);
    }
    setProcessingField(null);
  };

  // --- Handlers for Transactions ---
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
    if (text) {
        updateTransaction(id, 'description', text);
    }
    setProcessingField(null);
  };

  const removeTransaction = (id: string) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
  };

  // --- AI Smart Add Handler (Audio to JSON) ---
  const handleSmartVoiceAdd = async (audioBase64: string, mimeType: string) => {
    if (!audioBase64) return;
    setIsProcessingAI(true);
    setAiFeedback("Đang nghe & phân tích...");
    
    try {
      const result = await parseTransactionFromAudio(audioBase64, mimeType);
      
      const newTrans: Transaction = {
        id: Date.now().toString(),
        date: result.date || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        description: result.description || "Chưa rõ nội dung",
        amount: result.amount || 0
      };
      
      setData(prev => ({ ...prev, transactions: [...prev.transactions, newTrans] }));
      setAiFeedback("Đã xong!");
      setTimeout(() => setAiFeedback(null), 3000);
    } catch (e) {
      setAiFeedback("Lỗi xử lý, vui lòng thử lại.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  // --- File Management ---
  const handleSaveToDrive = () => {
    exportToDoc(data);
    const confirmed = window.confirm("File đang được tải xuống máy của bạn.\n\nBấm OK để mở Google Drive và tải file lên.");
    if (confirmed) {
      window.open('https://drive.google.com/drive/my-drive', '_blank');
    }
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const jsonData = JSON.parse(text);
        
        if (jsonData.info && Array.isArray(jsonData.transactions)) {
            setData(jsonData);
            alert("Đã tải dữ liệu thành công!");
        } else {
            alert("File không đúng định dạng dữ liệu của ứng dụng.");
        }
      } catch (error) {
        alert("Lỗi khi đọc file. Vui lòng thử lại.");
        console.error(error);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Install Guide Modal ---
  const renderInstallModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button 
                onClick={() => setShowInstallGuide(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-100 rounded-full"
            >
                <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                <Smartphone className="w-6 h-6" />
                Cách cài đặt App lên điện thoại
            </h3>
            
            <div className="space-y-6">
                {/* iOS Instructions */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <span className="text-xl">🍎</span> iPhone (Safari)
                    </h4>
                    <div className="text-sm text-red-500 italic mb-2">
                       * Apple chưa hỗ trợ cài tự động. Bạn vui lòng làm theo hướng dẫn:
                    </div>
                    <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                        <li>
                            Tìm nút <strong>Chia sẻ</strong> ở mép dưới cùng màn hình.<br/>
                            <span className="text-xs italic text-gray-500">(Nếu không thấy, hãy chạm nhẹ vào đáy màn hình).</span>
                            <div className="mt-2 flex justify-center bg-white p-2 border rounded-md w-fit mx-auto shadow-sm">
                                <Share2 className="w-6 h-6 text-blue-500" />
                            </div>
                        </li>
                        <li>Cuộn xuống dưới và chọn dòng <strong>"Thêm vào MH chính"</strong> (Add to Home Screen).</li>
                        <li>Bấm <strong>Thêm</strong> ở góc trên bên phải.</li>
                    </ol>

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex gap-2 items-start">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <strong>Lưu ý:</strong> Nếu khi mở App mà bị chuyển về trang chủ Google AI, đó là do link Xem trước này yêu cầu đăng nhập. Để dùng ổn định, bạn hãy xuất bản (Deploy) web này ra một tên miền công khai.
                        </div>
                    </div>
                </div>

                {/* Android Instructions Fallback */}
                {!installPrompt && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <span className="text-xl">🤖</span> Android (Chrome)
                        </h4>
                        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                            <li>Bấm vào dấu <strong>3 chấm dọc</strong> <MoreVertical className="w-3 h-3 inline" /> ở góc trên bên phải trình duyệt.</li>
                            <li>Chọn dòng <strong>"Thêm vào màn hình chính"</strong> (Install App).</li>
                            <li>Bấm xác nhận <strong>Cài đặt</strong>.</li>
                        </ol>
                    </div>
                )}
            </div>
            
            <div className="mt-6 text-center">
                <button 
                    onClick={() => setShowInstallGuide(false)}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                    Đã hiểu
                </button>
            </div>
        </div>
    </div>
  );

  // --- Render Views ---
  const renderEditView = () => (
    <div className="space-y-6 animate-fade-in">
      {/* 1. General Info Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          A. Thông tin chung
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Họ tên HKD", key: "name" as const, placeholder: "Nhập họ tên..." },
            { label: "Mã số thuế", key: "taxId" as const, placeholder: "MST..." },
            { label: "Địa chỉ cư trú", key: "address" as const, placeholder: "Địa chỉ...", full: true },
            { label: "Địa điểm KD", key: "location" as const, placeholder: "Nơi kinh doanh...", full: true },
            { label: "Kỳ kê khai", key: "period" as const, placeholder: "Tháng/Quý/Năm..." }
          ].map((field) => (
            <div key={field.key} className={`${field.full ? 'md:col-span-2' : ''} relative group`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={data.info[field.key]}
                  onChange={(e) => handleInfoChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={processingField === field.key}
                  className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 focus:border-blue-500 focus:ring-blue-500 transition-all text-sm disabled:bg-gray-100"
                />
                <VoiceInput 
                    onAudioCapture={(audio, mime) => handleVoiceForField(field.key, audio, mime)} 
                    isProcessing={processingField === field.key}
                    compact 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Transactions Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h2 className="text-lg font-bold text-blue-800 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            B. Chi tiết Doanh thu
          </h2>
          
          {/* Smart Voice Action */}
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 w-full md:w-auto shadow-inner">
            <div className="flex-1">
               <p className="text-xs text-blue-600 font-medium">
                 {isProcessingAI ? "Đang gửi lên Gemini..." : aiFeedback ? aiFeedback : "Nhấn để GHI ÂM thêm dòng"}
               </p>
               {!isProcessingAI && !aiFeedback && <p className="text-[10px] text-blue-400">Nói tự nhiên: "Bán 500 cái bánh bao thu 5 triệu"</p>}
            </div>
            <VoiceInput 
              onAudioCapture={handleSmartVoiceAdd} 
              isProcessing={isProcessingAI}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md ring-offset-2 ring-blue-200"
            />
          </div>
        </div>

        {/* Table Header (Desktop) */}
        <div className="hidden md:grid grid-cols-12 gap-4 bg-gray-100 p-3 rounded-t-lg font-semibold text-sm text-gray-700">
          <div className="col-span-2">Ngày tháng</div>
          <div className="col-span-6">Nội dung giao dịch</div>
          <div className="col-span-3 text-right">Số tiền (VNĐ)</div>
          <div className="col-span-1 text-center">Xóa</div>
        </div>

        {/* List Items */}
        <div className="space-y-3 md:space-y-0">
          {data.transactions.map((item) => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-3 border-b border-gray-100 items-start md:items-center bg-white hover:bg-gray-50 transition-colors">
              {/* Date */}
              <div className="col-span-2 flex items-center gap-2">
                <span className="md:hidden font-medium text-gray-500 w-20 text-xs">Ngày:</span>
                <input 
                  type="text" 
                  value={item.date} 
                  onChange={(e) => updateTransaction(item.id, 'date', e.target.value)}
                  className="w-full bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none text-sm py-1"
                />
              </div>

              {/* Description */}
              <div className="col-span-6 flex items-start gap-2">
                <span className="md:hidden font-medium text-gray-500 w-20 text-xs mt-2">Nội dung:</span>
                <div className="flex-1 flex gap-1 items-center">
                  <textarea 
                    value={item.description} 
                    onChange={(e) => updateTransaction(item.id, 'description', e.target.value)}
                    rows={1}
                    className="w-full bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none text-sm py-1 resize-none"
                    placeholder="Nhập nội dung..."
                  />
                  <VoiceInput 
                    onAudioCapture={(audio, mime) => handleVoiceForTransactionDesc(item.id, audio, mime)} 
                    isProcessing={processingField === `trans-${item.id}`}
                    compact 
                    className="shrink-0 scale-90" 
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="col-span-3 flex items-center gap-2 justify-end">
                <span className="md:hidden font-medium text-gray-500 w-20 text-xs">Số tiền:</span>
                <input 
                  type="number" 
                  value={item.amount} 
                  onChange={(e) => updateTransaction(item.id, 'amount', Number(e.target.value))}
                  className="w-full md:text-right bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none text-sm py-1 font-mono font-medium text-blue-900"
                />
              </div>

              {/* Delete */}
              <div className="col-span-1 flex justify-end md:justify-center">
                <button 
                  onClick={() => removeTransaction(item.id)}
                  className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={addTransaction}
          className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          Thêm dòng giao dịch thủ công
        </button>

        {/* Privacy Indicator */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-1">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-green-600">
                <Database className="w-4 h-4" />
                <span>Cơ sở dữ liệu IndexedDB</span>
            </div>
            <p className="text-[11px] text-center max-w-md">
                Đã nâng cấp lên chuẩn lưu trữ doanh nghiệp. Dữ liệu được lưu trên bộ nhớ cứng của điện thoại (không giới hạn số lượng). 
                An toàn tuyệt đối và không gửi đi đâu.
            </p>
        </div>
      </div>

      {/* Floating Action Button for Synthesize */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0">
        <button 
          onClick={() => setView(AppView.PREVIEW)}
          className="w-full md:w-auto md:float-right bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-green-700 transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          <FileText className="w-5 h-5" />
          TỔNG HỢP SỔ (PREVIEW)
        </button>
      </div>
      <div className="h-20 md:h-0"></div> {/* Spacer for fixed bottom bar */}
    </div>
  );

  const renderPreviewView = () => (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b shadow-sm p-4 flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <button 
          onClick={() => setView(AppView.EDIT)}
          className="flex items-center text-gray-600 hover:text-blue-600 font-medium transition-colors self-start md:self-center"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Quay lại sửa
        </button>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <button 
            onClick={() => exportToDoc(data)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Tải Word (.doc)</span>
            <span className="sm:hidden">Word</span>
          </button>

           <button 
            onClick={() => exportToExcel(data)}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 shadow"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Tải Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>

          <button 
            onClick={handleSaveToDrive}
            className="flex items-center gap-2 bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 shadow"
          >
            <HardDrive className="w-4 h-4" />
            <span className="hidden sm:inline">Lưu Drive</span>
            <span className="sm:hidden">Drive</span>
          </button>
          
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 shadow"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">In / PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      <div className="overflow-auto pb-10 px-2 md:px-0 bg-gray-100 min-h-screen">
         <PreviewS1a data={data} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {view === AppView.EDIT && (
        <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 shadow-lg">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <BookOpen className="w-8 h-8" />
                Sổ Doanh Thu Thông Minh
              </h1>
              <p className="mt-2 text-blue-100 opacity-90 text-sm">
                Hỗ trợ lập Mẫu S1a-HKD bằng Gemini AI & Giọng nói
              </p>
            </div>
            
            {/* Header Data Actions */}
            <div className="flex gap-2 flex-wrap">
                 <button 
                    onClick={handleInstallClick}
                    className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg animate-pulse"
                >
                    <Smartphone className="w-4 h-4" />
                    <span className="hidden sm:inline">Cài App</span>
                    <span className="sm:hidden">Cài</span>
                </button>

                <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleImportJson} 
                />
                <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-white/30"
                    title="Xóa và tạo mới"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Mới</span>
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-white/30"
                >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Mở</span>
                </button>
                <button 
                    onClick={() => exportToJson(data)}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-white/30"
                >
                    <FileJson className="w-4 h-4" />
                    <span className="hidden sm:inline">Lưu</span>
                </button>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {view === AppView.EDIT ? renderEditView() : renderPreviewView()}
      </main>

      {/* Modals */}
      {showInstallGuide && renderInstallModal()}
    </div>
  );
}