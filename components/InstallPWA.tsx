import React, { useState, useEffect } from 'react';
import { Share, Download, X, Smartphone, PlusSquare, ArrowBigDown } from 'lucide-react';

export default function InstallPWA() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Kiểm tra xem ứng dụng đã được cài đặt chưa (chạy ở chế độ standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                        || (window.navigator as any).standalone 
                        || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Xác định hệ điều hành
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }

    // Hiển thị sau 3 giây để không làm phiền ngay lập tức
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-[100] animate-in slide-in-from-bottom duration-500">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-indigo-100 p-5 relative overflow-hidden">
        <button 
          onClick={() => setShow(false)} 
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
             <Smartphone className="w-8 h-8 text-white" />
          </div>
          
          <div className="flex-1">
            <h4 className="font-black text-indigo-900 text-lg leading-tight">Cài đặt Sổ doanh thu AI</h4>
            <p className="text-gray-500 text-sm mt-1 leading-snug">
              Thêm ứng dụng vào màn hình chính để sử dụng nhanh chóng và tiện lợi như app thật.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          {platform === 'ios' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs">1</span>
                <span>Nhấn nút <Share className="w-4 h-4 inline text-blue-500 mx-1" /> <strong>Chia sẻ</strong> ở thanh công cụ phía dưới</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs">2</span>
                <span>Chọn <PlusSquare className="w-4 h-4 inline text-gray-700 mx-1" /> <strong>Thêm vào MH chính</strong></span>
              </div>
            </div>
          ) : platform === 'android' ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <ArrowBigDown className="w-4 h-4 text-green-500 animate-bounce" />
                Nhấn vào menu trình duyệt (3 chấm) và chọn <strong>Cài đặt ứng dụng</strong> hoặc <strong>Thêm vào MH chính</strong>.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-700">Hãy thêm trang này vào màn hình chính của bạn.</p>
          )}
        </div>
        
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-50 rounded-full -z-10 opacity-50"></div>
      </div>
    </div>
  );
}