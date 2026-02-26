package com.leszek.busscheduler.controller;

import com.leszek.busscheduler.config.SecurityConfig;
import com.leszek.busscheduler.service.BusLineService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BusLineController.class)
@Import(SecurityConfig.class)
class BusLineControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BusLineService busLineService;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private JwtService jwtService;

    // Wyjaśnienie: Używamy @WithMockUser zamiast prawdziwego logowania, ponieważ celem tego testu
    // jest weryfikacja konfiguracji bezpieczeństwa (autoryzacji i dostępu do endpointów),
    // a nie samego procesu uwierzytelniania (logowania). @WithMockUser pozwala na szybkie
    // i łatwe "wstrzyknięcie" skonfigurowanego użytkownika do kontekstu bezpieczeństwa Spring Security.

    @Test
    @DisplayName("Publiczny GET /api/v1/buslines - 200 OK")
    void shouldAllowPublicAccessToGetAllBusLines() throws Exception {
        when(busLineService.findAll()).thenReturn(java.util.Collections.emptyList());

        mockMvc.perform(get("/api/v1/buslines"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Chroniony POST (Brak Auth) - 401 Unauthorized")
    void shouldDenyPostAccessWithoutAuth() throws Exception {
        mockMvc.perform(post("/api/v1/buslines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Chroniony DELETE (Brak Auth) - 401 Unauthorized")
    void shouldDenyDeleteAccessWithoutAuth() throws Exception {
        mockMvc.perform(delete("/api/v1/buslines/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    @DisplayName("Chroniony POST (Zalogowany Admin) - 201 Created")
    void shouldAllowPostAccessForAdmin() throws Exception {
        com.leszek.busscheduler.domain.BusLine busLine = new com.leszek.busscheduler.domain.BusLine();
        busLine.setId(1L);
        busLine.setLineNumber("100");
        busLine.setOperator("ZTM");
        
        when(busLineService.save(any())).thenReturn(busLine);

        // Kontroler może zwrócić 400 Bad Request jeśli body jest nieprawidłowe, 
        // ale 200/201 oznacza, że przeszedł przez Security.
        // W naszym przypadku kontroler zwraca 201 przy sukcesie.
        mockMvc.perform(post("/api/v1/buslines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lineNumber\":\"100\", \"operator\":\"ZTM\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    @DisplayName("Chroniony DELETE (Zalogowany Admin) - 204 No Content")
    void shouldAllowDeleteAccessForAdmin() throws Exception {
        when(busLineService.deleteById(1L)).thenReturn(true);

        mockMvc.perform(delete("/api/v1/buslines/1"))
                .andExpect(status().isNoContent());
    }
}
