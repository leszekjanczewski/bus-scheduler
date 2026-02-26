package com.leszek.busscheduler.service;

import com.leszek.busscheduler.dto.ImportBusLineDTO;

public interface DataImportService {
    void importBusLine(ImportBusLineDTO dto);
}
