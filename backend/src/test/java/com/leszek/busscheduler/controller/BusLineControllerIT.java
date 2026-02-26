package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BusLineControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnAllBusLines() throws Exception {
        mockMvc.perform(get("/api/v1/buslines"))
                .andExpect(status().isOk());
    }
}
