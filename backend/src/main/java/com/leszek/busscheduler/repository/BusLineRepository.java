package com.leszek.busscheduler.repository;

import com.leszek.busscheduler.domain.BusLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BusLineRepository extends JpaRepository<BusLine, Long> {
    BusLine findByLineNumber(String lineNumber);

    @Query("SELECT DISTINCT b FROM BusLine b LEFT JOIN FETCH b.routes")
    List<BusLine> findAllWithRoutes();
}