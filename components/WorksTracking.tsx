    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        try {
            await downloadFromSupabase();
        } catch (e) {
            console.error(e);
            alert('فشل تحديث البيانات.');
        } finally {
            setTimeout(() => setIsRefreshing(false), 800);
        }
    };

    const analyzeSheet = (wb: any, sheetName: string) => {
        if (!wb || !sheetName) return;
        const { headers, data } = getSheetHeadersAndData(wb, sheetName);
        
        const potentialHeaders = headers.filter(h => {
            const lowerH = h.toLowerCase().trim();
            return !IGNORED_COLUMNS.some(ig => lowerH.includes(ig.toLowerCase()));
        });
        
        setAvailableHeaders(potentialHeaders);
        setSelectedHeaders(new Set()); 

        const unmatched: string[] = [];
        
        data.forEach(row => {
            let student: Student | undefined;
            const rowNid = row['الهوية'] || row['السجل'] || row['id'] || row['nationalId'];
            if (rowNid) student = students.find(s => s.nationalId === String(rowNid).trim());
            if (!student) {
                const rowName = findStudentNameInRow(row);
                if (rowName) {
                    const cleanName = String(rowName).trim();
                    student = students.find(s => s.name.trim() === cleanName);
                    if (!student) unmatched.push(cleanName);
                }
            }
        });
        
        setUnmatchedStudents(Array.from(new Set(unmatched)).slice(0, 50));
    };

    // ... (Excel Fetch & Sync Logic - mostly same) ...
    const handleFetchSheetStructure = async () => {
        if (!googleSheetUrl) return alert('يرجى إدخال رابط الملف');
        setIsFetchingStructure(true);
        try {
            saveWorksMasterUrl(googleSheetUrl);
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            if (sheetNames.length === 0) throw new Error('الملف فارغ');
            setWorkbookRef(workbook);
            setSheetNames(sheetNames);
            const targetSheet = selectedSheetName && sheetNames.includes(selectedSheetName) ? selectedSheetName : sheetNames[0];
            setSelectedSheetName(targetSheet);
            analyzeSheet(workbook, targetSheet);
            setSyncStep('SELECTION');
        } catch (e: any) {
            alert('فشل الاتصال بالملف: ' + e.message);
        } finally {
            setIsFetchingStructure(false);
        }
    };