package com.leszek.busscheduler.service;

import com.leszek.busscheduler.domain.BusLine;
import java.util.List;
import java.util.Optional;

public interface BusLineService {
    List<BusLine> findAll();
    Optional<BusLine> findById(Long id);
    BusLine save(BusLine busLine);
    boolean deleteById(Long id);

    List<BusLine> findAllWithRoutes();
}
