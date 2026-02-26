package com.leszek.busscheduler.service.impl;

import com.leszek.busscheduler.domain.BusLine;
import com.leszek.busscheduler.repository.BusLineRepository;
import com.leszek.busscheduler.service.BusLineService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BusLineServiceImpl implements BusLineService {

    @Override
    @Transactional(readOnly = true)
    public List<BusLine> findAllWithRoutes() { return busLineRepository.findAllWithRoutes(); }

    private final BusLineRepository busLineRepository;

    @Override
    @Transactional(readOnly = true)
    public List<BusLine> findAll() {
        return busLineRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BusLine> findById(Long id) {
        return busLineRepository.findById(id);
    }

    @Override
    @Transactional
    public BusLine save(BusLine busLine) {
        return busLineRepository.save(busLine);
    }

    @Override
    @Transactional
    public boolean deleteById(Long id) {
        if (busLineRepository.existsById(id)) {
            busLineRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
