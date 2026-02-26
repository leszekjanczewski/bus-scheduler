package com.leszek.busscheduler.repository;

import com.leszek.busscheduler.domain.BusStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BusStopRepository extends JpaRepository<BusStop, Long> {
    Optional<BusStop> findByName(String name);
    Optional<BusStop> findByNameAndCity(String name, String city);
}

