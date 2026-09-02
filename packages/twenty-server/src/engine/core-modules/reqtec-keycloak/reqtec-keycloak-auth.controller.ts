import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { createHmac, timingSafeEqual } from 'crypto';
import { type Request, type Response } from 'express';
import { Repository } from 'typeorm';

import { LoginTokenService } from 'src/engine/core-modules/auth/token/services/login-token.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { AppPath } from 'twenty-shared/types';

import { ReqtecKeycloakOidcService } from './reqtec-keycloak-oidc.service';

const COOKIE_NAME = 'reqtec_keycloak_oidc';

type OidcCookie = {
  state: string;
  verifier: string;
  workspaceId?: string;
  returnToPath?: string;
};

@Controller('auth/keycloak')
export class ReqtecKeycloakAuthController {
  constructor(
    private readonly oidc: ReqtecKeycloakOidcService,
    private readonly loginTokenService: LoginTokenService,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
  ) {}

  @Get()
  async start(
    @Query('workspaceId') workspaceId: string | undefined,
    @Query('returnToPath') returnToPath: string | undefined,
    @Res() res: Response,
  ) {
    if (!this.oidc.isEnabled()) {
      throw new UnauthorizedException('Keycloak auth is not enabled');
    }

    const { verifier, challenge } = this.oidc.createPkce();
    const state = this.oidc.createState();
    const payload: OidcCookie = {
      state,
      verifier,
      workspaceId,
      returnToPath,
    };

    res.cookie(COOKIE_NAME, this.signCookie(payload), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 10 * 60 * 1000,
      path: '/',
    });

    const authorizationUrl = await this.oidc.buildAuthorizationUrl({
      state,
      codeChallenge: challenge,
      workspaceId,
      returnToPath,
    });

    return res.redirect(authorizationUrl);
  }

  @Get('redirect')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!this.oidc.isEnabled()) {
      throw new UnauthorizedException('Keycloak auth is not enabled');
    }

    if (!code || !state) {
      throw new UnauthorizedException('Missing OIDC code or state');
    }

    const rawCookie = req.cookies?.[COOKIE_NAME];
    const cookie = rawCookie ? this.readCookie(String(rawCookie)) : null;

    res.clearCookie(COOKIE_NAME, { path: '/' });

    if (!cookie || cookie.state !== state) {
      throw new UnauthorizedException('Invalid OIDC state');
    }

    const profile = await this.oidc.exchangeCode(code, cookie.verifier);
    const user = await this.userRepository.findOne({
      where: { email: profile.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        this.oidc.allowJit()
          ? 'JIT provisioning is not wired to SignInUpService in this first cut. Invite the user in Twenty first.'
          : `No Twenty user for ${profile.email}. Invite them in Twenty first.`,
      );
    }

    const membership = await this.userWorkspaceRepository.findOne({
      where: cookie.workspaceId
        ? { userId: user.id, workspaceId: cookie.workspaceId }
        : { userId: user.id },
    });

    const workspaceId = membership?.workspaceId ?? cookie.workspaceId;

    if (!workspaceId) {
      throw new UnauthorizedException(
        'User is not a member of any Twenty workspace',
      );
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new UnauthorizedException('Workspace not found');
    }

    const loginToken = await this.loginTokenService.generateLoginToken(
      user.email,
      workspace.id,
      AuthProviderEnum.Password,
    );

    const url = this.workspaceDomainsService.buildWorkspaceURL({
      workspace,
      pathname: AppPath.Verify,
      searchParams: {
        loginToken: loginToken.token,
        ...(cookie.returnToPath && cookie.returnToPath.startsWith('/')
          ? { returnToPath: cookie.returnToPath }
          : {}),
      },
    });

    return res.redirect(url.toString());
  }

  private signCookie(payload: OidcCookie): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.cookieSecret())
      .update(body)
      .digest('base64url');

    return `${body}.${sig}`;
  }

  private readCookie(value: string): OidcCookie {
    const [body, sig] = value.split('.');

    if (!body || !sig) {
      throw new UnauthorizedException('Malformed OIDC cookie');
    }

    const expected = createHmac('sha256', this.cookieSecret())
      .update(body)
      .digest('base64url');

    const a = Buffer.from(sig);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('OIDC cookie signature mismatch');
    }

    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OidcCookie;
  }

  private cookieSecret(): string {
    return process.env.APP_SECRET || process.env.AUTH_KEYCLOAK_CLIENT_SECRET || 'reqtec-oidc';
  }
}
