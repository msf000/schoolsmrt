import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ملف مكرر - المكون الأساسي موجود في المجلد الرئيسي (Root)
 */
const AppPlaceholder: React.FC = () => {
    return <Navigate to="/" replace />;
};

export default AppPlaceholder;