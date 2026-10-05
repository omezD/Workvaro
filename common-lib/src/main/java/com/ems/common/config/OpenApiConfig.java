package com.ems.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger UI with a "Bearer token" Authorize button (paste a Keycloak access token). */
@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

    @Bean
    OpenAPI emsOpenApi(@Value("${spring.application.name:ems-service}") String appName) {
        return new OpenAPI()
                .info(new Info().title("EMS " + appName).version("v1"))
                .components(new Components().addSecuritySchemes("bearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
