uniform sampler2D uMask;

varying float vAlpha;

vec3 color=vec3(27/255,255/255,42/255);

void main()
{
    float maskStrength=texture2D(uMask,gl_PointCoord).r;
    gl_FragColor=vec4(color,maskStrength*vAlpha);
}