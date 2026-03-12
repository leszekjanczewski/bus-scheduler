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

    interface BusStopWithDirections {
        Long getId();
        String getName();
        String getCity();
        Double getLatitude();
        Double getLongitude();
        String getDirection();
        List<String> getDirections();
    }

    @Query(value = """
            SELECT b.id as id, b.name as name, b.city as city, 
                   b.latitude as latitude, b.longitude as longitude, 
                   b.direction as direction,
                   STRING_AGG(DISTINCT r.direction, ';') as directions_str
            FROM bus_stops b
            LEFT JOIN route_stops rs ON rs.bus_stop_id = b.id
            LEFT JOIN routes r ON r.id = rs.route_id
            WHERE b.latitude BETWEEN :minLat AND :maxLat
              AND b.longitude BETWEEN :minLon AND :maxLon
            GROUP BY b.id, b.name, b.city, b.latitude, b.longitude, b.direction
            """, nativeQuery = true)
    List<Object[]> findWithinBoundingBoxWithDirectionsNative(@Param("minLat") Double minLat, @Param("maxLat") Double maxLat,
                                                              @Param("minLon") Double minLon, @Param("maxLon") Double maxLon);
}

