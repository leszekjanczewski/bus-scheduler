package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.config.SecurityConfig;
import com.leszek.busscheduler.domain.BusStop;
import com.leszek.busscheduler.repository.BusStopRepository;
import com.leszek.busscheduler.security.CustomUserDetailsService;
import com.leszek.busscheduler.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BusStopController.class)
@Import(SecurityConfig.class)
class BusStopControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BusStopRepository busStopRepository;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("GET /api/v1/busstops - Should return list of bus stops")
    void shouldReturnAllBusStops() throws Exception {
        BusStop stop = BusStop.builder().id(1L).name("Centrum").city("Szczecin").build();
        when(busStopRepository.findAll()).thenReturn(List.of(stop));

        mockMvc.perform(get("/api/v1/busstops"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Centrum"));
    }

    @Test
    @DisplayName("GET /api/v1/busstops/{id} - Should return bus stop if exists")
    void shouldReturnBusStopById() throws Exception {
        BusStop stop = BusStop.builder().id(1L).name("Centrum").city("Szczecin").build();
        when(busStopRepository.findById(1L)).thenReturn(Optional.of(stop));

        mockMvc.perform(get("/api/v1/busstops/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Centrum"));
    }

    @Test
    @DisplayName("GET /api/v1/busstops/{id} - Should return 404 if not found")
    void shouldReturn404WhenBusStopNotFound() throws Exception {
        when(busStopRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/busstops/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("POST /api/v1/busstops - Should create bus stop (Admin only)")
    void shouldCreateBusStop() throws Exception {
        BusStop savedStop = BusStop.builder().id(1L).name("Nowy").city("Szczecin").build();
        when(busStopRepository.save(any(BusStop.class))).thenReturn(savedStop);

        mockMvc.perform(post("/api/v1/busstops")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nowy\", \"city\":\"Szczecin\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Nowy"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("DELETE /api/v1/busstops/{id} - Should delete bus stop if exists")
    void shouldDeleteBusStop() throws Exception {
        when(busStopRepository.existsById(1L)).thenReturn(true);

        mockMvc.perform(delete("/api/v1/busstops/1"))
                .andExpect(status().isNoContent());
    }
}
