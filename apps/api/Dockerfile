FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY apps/api/src/Api/Api.csproj apps/api/src/Api/
RUN dotnet restore apps/api/src/Api/Api.csproj
COPY apps/api/src/Api apps/api/src/Api
RUN dotnet publish apps/api/src/Api/Api.csproj -c Release -o /out --no-restore /p:UseAppHost=false
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app/wwwroot/reports /app/keys && chown -R app:app /app
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet","Api.dll"]
