# One image recipe for every Spring Boot service. Pick the module with --build-arg MODULE=...
#   docker build --build-arg MODULE=employee-service -t ems/employee-service .
# docker-compose.prod.yml does this for all three services.

FROM maven:3.9-eclipse-temurin-17 AS build
ARG MODULE
WORKDIR /src
# Download dependencies first, so code changes don't re-download the whole internet
COPY pom.xml .
COPY common-lib/pom.xml common-lib/
COPY api-gateway/pom.xml api-gateway/
COPY employee-service/pom.xml employee-service/
COPY leave-attendance-service/pom.xml leave-attendance-service/
RUN mvn -B -q -pl ${MODULE} -am dependency:go-offline || true
COPY common-lib common-lib
COPY api-gateway api-gateway
COPY employee-service employee-service
COPY leave-attendance-service leave-attendance-service
RUN mvn -B -pl ${MODULE} -am package -DskipTests \
 && cp ${MODULE}/target/${MODULE}-*.jar /src/app.jar

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Run as an unprivileged user, never root
RUN addgroup -S ems && adduser -S ems -G ems
COPY --from=build /src/app.jar app.jar
USER ems
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
