package com.leszek.busscheduler.service;

import com.leszek.busscheduler.dto.ConnectionDTO;
import com.leszek.busscheduler.dto.SearchRequest;

import java.util.List;

public interface BusSearchService {
    List<ConnectionDTO> search(SearchRequest request);
}
