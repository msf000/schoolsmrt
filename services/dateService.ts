
export const formatDualDate = (dateStr: string | Date): string => {
    const date = new Date(dateStr);
    
    // Check if valid date
    if (isNaN(date.getTime())) return dateStr ? dateStr.toString() : '';

    const gregorian = new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    }).format(date);

    const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    }).format(date);

    return `${gregorian} م  |  ${hijri} هـ`;
};

export const getHijriOnly = (dateStr: string | Date): string => {
     const date = new Date(dateStr);
     if (isNaN(date.getTime())) return "";
     return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    }).format(date);
}
