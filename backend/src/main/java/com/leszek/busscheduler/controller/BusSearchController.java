package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.dto.ConnectionDTO;
import com.leszek.busscheduler.dto.SearchRequest;
import com.leszek.busscheduler.service.BusSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalTime;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class BusSearchController {

    private final BusSearchService busSearchService;

    @GetMapping
    public ResponseEntity<List<ConnectionDTO>> search(
            @RequestParam(name = "fromId") Long fromId,
            @RequestParam(name = "toId") Long toId,
            @RequestParam(name = "time") @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime time) {
        SearchRequest request = new SearchRequest(fromId, toId, time);
        List<ConnectionDTO> results = busSearchService.search(request);
        return ResponseEntity.ok(results);
    }
}
