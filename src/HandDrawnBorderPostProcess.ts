import {
  AbstractMesh,
  Camera,
  Color3,
  Effect,
  Nullable,
  PostProcess,
} from "@babylonjs/core";

const shaderUrl = "HandDrawn";

Effect.ShadersStore[`${shaderUrl}FragmentShader`] = `
  precision highp float;

  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform sampler2D depthSampler;
  uniform sampler2D normalSampler;
  uniform mat4 uViewProjection;
  uniform mat4 uView;
  uniform float uNear;
  uniform float uFar;
  uniform vec2 uResolution;
  uniform float uOutlineThickness;
  uniform vec3 uOutlineColor;


  float LinearizeDepth(sampler2D depthSampler, vec2 vUV) {
    vec4 depthTex = texture2D(depthSampler, vUV);
    float depth = depthTex.r;
    float zNdc = 2.0 * depth - 1.0;
    float zEye = (2.0 * uFar * uNear) / ((uFar + uNear) - zNdc * (uFar - uNear));
    float linearDepth = (zEye - uNear) / (uFar - uNear);
    return abs(linearDepth);
  }

  vec3 getPosition(sampler2D depthSampler, vec2 uv) {
    float depth = LinearizeDepth(depthSampler, uv);
    vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 viewPos = inverse(uViewProjection) * ndc;
    return viewPos.xyz / viewPos.w;
}

  const mat3 Sx = mat3( -1, -2, -1, 0, 0, 0, 1, 2, 1 );
  const mat3 Sy = mat3( -1, 0, 1, -2, 0, 2, -1, 0, 1 );

  float luma(vec3 color) {
    const vec3 magic = vec3(0.2125, 0.7154, 0.0721);
    return dot(magic, color);
  }
  
  const vec2 E = vec2(1, 0);
  const vec2 W = vec2(-1, 0);
  const vec2 N = vec2(0, 1);
  const vec2 S = vec2(0, -1);
  const vec2 NE = vec2(1, 1);
  const vec2 NW = vec2(-1, 1);
  const vec2 SE = vec2(1, -1);
  const vec2 SW = vec2(-1, -1);

  const vec2 center = vec2(0, 0);

  float hash(vec2 p) {
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);

    return fract((p3.x + p3.y) * p3.z);
  }

  const float frequency = 0.05;
  const float amplitude = 2.0;

  void main() {

    vec2 texel = vec2( 1.0 / uResolution.x, 1.0 / uResolution.y );
    // float outlineThickness = 1.5;
    // vec4 vec4(uOutlineColor, 1.0) = vec4(0.0, 0.0, 0.0, 1.0);

    // vec2 displacement = vec2(
    //   (hash(gl_FragCoord.xy) * sin(gl_FragCoord.y * frequency)) ,
    //   (hash(gl_FragCoord.xy) * cos(gl_FragCoord.x * frequency))
    // ) * amplitude / uResolution.xy;
    vec2  displacement = vec2(0.0, 0.0);

    vec4 pixelColor = texture2D(textureSampler, vUV);

    vec2 offsetConst =  uOutlineThickness * texel;
    vec2 displacedUV = vUV + displacement;
    vec2 offset00 = displacedUV + uOutlineThickness * texel * NW;
    vec2 offset01 = displacedUV + uOutlineThickness * texel * W;
    vec2 offset02 = displacedUV + uOutlineThickness * texel * SW;
    vec2 offset10 = displacedUV + uOutlineThickness * texel * N;
    vec2 offset11 = displacedUV + uOutlineThickness * texel * center;
    vec2 offset12 = displacedUV + uOutlineThickness * texel * S;
    vec2 offset20 = displacedUV + uOutlineThickness * texel * NE;
    vec2 offset21 = displacedUV + uOutlineThickness * texel * E;
    vec2 offset22 = displacedUV + uOutlineThickness * texel * SE;
    

    float depth00 = LinearizeDepth(depthSampler, offset00);
    float depth01 = LinearizeDepth(depthSampler, offset01);
    float depth02 = LinearizeDepth(depthSampler, offset02);

    float depth10 = LinearizeDepth(depthSampler, offset10);
    float depth11 = LinearizeDepth(depthSampler, offset11);
    float depth12 = LinearizeDepth(depthSampler, offset12);

    float depth20 = LinearizeDepth(depthSampler, offset20);
    float depth21 = LinearizeDepth(depthSampler, offset21);
    float depth22 = LinearizeDepth(depthSampler, offset22);

    float xSobelValue = Sx[0][0] * depth00 + Sx[1][0] * depth01 + Sx[2][0] * depth02 +
                      Sx[0][1] * depth10 + Sx[1][1] * depth11 + Sx[2][1] * depth12 +
                      Sx[0][2] * depth20 + Sx[1][2] * depth21 + Sx[2][2] * depth22;

    float ySobelValue = Sy[0][0] * depth00 + Sy[1][0] * depth01 + Sy[2][0] * depth02 +
                      Sy[0][1] * depth10 + Sy[1][1] * depth11 + Sy[2][1] * depth12 +
                      Sy[0][2] * depth20 + Sy[1][2] * depth21 + Sy[2][2] * depth22;

    // Combining both Vertical and Horizontal output to detect all edges
    float gradientDepth = sqrt(pow(xSobelValue, 2.0) + pow(ySobelValue, 2.0));
    gradientDepth = smoothstep(0.01, 0.2, gradientDepth);

    float normal00 = luma(texture2D(normalSampler, offset00).rgb);
    float normal01 = luma(texture2D(normalSampler, offset01).rgb);
    float normal02 = luma(texture2D(normalSampler, offset02).rgb);

    float normal10 = luma(texture2D(normalSampler, offset10).rgb);
    float normal11 = luma(texture2D(normalSampler, offset11).rgb);
    float normal12 = luma(texture2D(normalSampler, offset12).rgb);

    float normal20 = luma(texture2D(normalSampler, offset20).rgb);
    float normal21 = luma(texture2D(normalSampler, offset21).rgb);
    float normal22 = luma(texture2D(normalSampler, offset22).rgb);

    float xSobelValueNormal = Sx[0][0] * normal00 + Sx[1][0] * normal01 + Sx[2][0] * normal02 +
                      Sx[0][1] * normal10 + Sx[1][1] * normal11 + Sx[2][1] * normal12 +
                      Sx[0][2] * normal20 + Sx[1][2] * normal21 + Sx[2][2] * normal22;
    
    float ySobelValueNormal = Sy[0][0] * normal00 + Sy[1][0] * normal01 + Sy[2][0] * normal02 +
                      Sy[0][1] * normal10 + Sy[1][1] * normal11 + Sy[2][1] * normal12 +
                      Sy[0][2] * normal20 + Sy[1][2] * normal21 + Sy[2][2] * normal22;

    // vec3 pos00 = getPosition(depthSampler, offset00);
    // vec3 pos01 = getPosition(depthSampler, offset01);
    // vec3 pos10 = getPosition(depthSampler, offset10);
    // vec3 pos11 = getPosition(depthSampler, offset11);
    // vec3 pos12 = getPosition(depthSampler, offset12);
    // vec3 pos21 = getPosition(depthSampler, offset21);
                  
    // // Calculate position-based edge
    // float posEdge = length(cross(pos10 - pos11, pos11 - pos12)) +
    //                 length(cross(pos01 - pos11, pos11 - pos21));
    // posEdge = smoothstep(0.001, 0.003, posEdge);
    
    float gradientNormal = sqrt(pow(xSobelValueNormal, 4.0) + pow(ySobelValueNormal, 4.0));                  
    gradientNormal = smoothstep(0.01, 0.2, gradientNormal); 

    float outline = max(gradientDepth, gradientNormal);

    vec4 color = mix(pixelColor, vec4(uOutlineColor, 1.0), outline);

    gl_FragColor = color;
  }
`;

export class HandDrawnBorderPostProcess extends PostProcess {
  private _renderList: AbstractMesh[] = [];

  public addOutlineMeshes(value: Nullable<AbstractMesh>) {
    if (value) {
      this._renderList.push(value);
    } else {
      this._renderList = [];
    }
  }

  public removeOutlineMesh(value: AbstractMesh) {
    //remove by mutating the array
    const index = this._renderList.indexOf(value);
    if (index > -1) {
      this._renderList.splice(index, 1);
    }
  }

  public get renderList(): Nullable<AbstractMesh[]> {
    return this._renderList;
  }

  private _outlineColor: Color3 = new Color3(0, 0, 0);
  private _outlineThickness = 1.5;

  constructor(name: string, camera: Camera) {
    super(
      name,
      shaderUrl,
      [
        "uResolution",
        "uEdgeWidth",
        "uFar",
        "uNear",
        "uViewProjection",
        "uView",
        "uOutlineThickness",
        "uOutlineColor",
      ],
      ["depthSampler", "normalSampler"],
      1,
      camera
    );

    const scene = camera.getScene();

    if (!scene) throw new Error("scene is null");

    const bufferRenderer = scene.enableGeometryBufferRenderer();

    if (!bufferRenderer) throw new Error("bufferRenderer is null");
    bufferRenderer.generateNormalsInWorldSpace = true;

    bufferRenderer.renderList = this._renderList;

    const gBuffer = bufferRenderer.getGBuffer();

    const effect = this.getEffect();

    this.onApply = () => {
      effect.setFloat2("uResolution", this.width, this.height);
      effect.setFloat("uEdgeWidth", 0.01);
      effect.setTexture("depthSampler", gBuffer.textures[2]);
      effect.setTexture("normalSampler", gBuffer.textures[1]);
      effect.setFloat("uOutlineThickness", this._outlineThickness);
      effect.setColor3("uOutlineColor", this._outlineColor);
      effect.setFloat("uFar", camera.maxZ);
      effect.setFloat("uNear", camera.minZ);
      effect.setMatrix("uViewProjection", camera.getProjectionMatrix());
      effect.setMatrix("uView", camera.getViewMatrix());
    };
  }

  public setOutlineColor(color: string) {
    this._outlineColor.fromHexString(color);
  }

  public setOutlineThickness(thickness: number) {
    this._outlineThickness = thickness;
  }
}
