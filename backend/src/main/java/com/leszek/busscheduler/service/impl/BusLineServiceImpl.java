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
    public List<BusLine> findAllWithRoutes() {
        // Two separate queries avoid MultipleBagFetchException (same pattern as findByIdWithFullDetails).
        // Hibernate's first-level cache merges both result sets into fully-loaded entities.
        List<BusLine> lines = busLineRepository.findAllWithRoutesAndStops();
        if (!lines.isEmpty()) {
            busLineRepository.findAllWithRoutesAndTrips();
        }
        return lines;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BusLine> findByIdWithFullDetails(Long id) {
        // Two separate queries avoid the Cartesian product from multi-bag JOIN FETCH.
        // Hibernate's first-level cache merges both result sets into one fully-loaded entity.
        Optional<BusLine> result = busLineRepository.findByIdWithRoutesAndStops(id);
        if (result.isPresent()) {
            busLineRepository.findByIdWithRoutesAndTrips(id);
        }
        return result;
    }

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
