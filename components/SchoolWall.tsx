
import React from 'react';

const SchoolWall: React.FC<any> = () => {
    return (
        <div className="flex items-center justify-center h-full p-20 text-slate-300 font-tajawal">
            <div className="text-center">
                <p className="text-2xl font-black mb-2 opacity-20">حائط المدرسة</p>
                <p className="text-sm font-bold">قريباً: معرض الإنجازات والفعاليات المدرسية المشتركة.</p>
            </div>
        </div>
    );
};

export default SchoolWall;
