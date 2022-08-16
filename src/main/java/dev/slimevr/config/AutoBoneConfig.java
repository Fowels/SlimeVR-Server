package dev.slimevr.config;

public class AutoBoneConfig {

	public int minDataDistance = 1;
	public int maxDataDistance = 1;
	public int numEpochs = 100;
	public float initialAdjustRate = 10f;
	public float adjustRateMultiplier = 0.995f;
	public float slideErrorFactor = 0.0f;
	public float offsetSlideErrorFactor = 1.0f;
	public float footHeightOffsetErrorFactor = 0.0f;
	public float bodyProportionErrorFactor = 0.2f;
	public float heightErrorFactor = 0.0f;
	public float positionErrorFactor = 0.0f;
	public float positionOffsetErrorFactor = 0.0f;
	public boolean calcInitError = false;
	public float targetHeight = -1;

	public int sampleCount = 1000;

	public long sampleRateMs = 20;

	public boolean saveRecordings = false;

	public AutoBoneConfig() {
	}
}
