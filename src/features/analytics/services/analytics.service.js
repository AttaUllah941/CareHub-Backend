class AnalyticsService {
  constructor(analyticsRepository) {
    this.analyticsRepository = analyticsRepository;
  }

  getRevenueTrends(query) {
    return this.analyticsRepository.getRevenueTrends(query);
  }

  getDoctorGrowthTrends(query) {
    return this.analyticsRepository.getDoctorGrowthTrends(query);
  }

  getPatientGrowthTrends(query) {
    return this.analyticsRepository.getPatientGrowthTrends(query);
  }

  getAppointmentGrowthTrends(query) {
    return this.analyticsRepository.getAppointmentGrowthTrends(query);
  }

  getOverview(query) {
    return this.analyticsRepository.getOverview(query);
  }
}

module.exports = AnalyticsService;
