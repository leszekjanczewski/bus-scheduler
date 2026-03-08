package com.leszek.busscheduler.repository;

import com.leszek.busscheduler.domain.BusStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusStopRepository extends JpaRepository<BusStop, Long> {
    Optional<BusStop> findByName(String name);
    Optional<BusStop> findByNameAndCity(String name, String city);

    @Query("SELECT b FROM BusStop b WHERE b.latitude IS NOT NULL AND b.longitude IS NOT NULL " +
           "AND b.latitude BETWEEN :minLat AND :maxLat " +
           "AND b.longitude BETWEEN :minLon AND :maxLon")
    List<BusStop> findWithinBoundingBox(@Param("minLat") Double minLat, @Param("maxLat") Double maxLat,
                                        @Param("minLon") Double minLon, @Param("maxLon") Double maxLon);
}

